import os
import sqlite3
import json
import platform
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import pandas as pd
import zipfile
from io import BytesIO

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS

# Constants
DATA_FILE = 'sto2024_dataset_CLEAN.csv'
DB_PATH = 'research_results.db'
RESULTS_DIR = 'analysis_results'
IS_WINDOWS = platform.system() == 'Windows'

# Ensure results directory exists
if not os.path.exists(RESULTS_DIR):
    os.makedirs(RESULTS_DIR)

def init_db():
    """Initialize the database and create necessary tables if they do not exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS research_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dependent_var TEXT NOT NULL,
            independent_vars TEXT,
            status TEXT NOT NULL,
            results_path TEXT NOT NULL
        );
    ''')
    conn.commit()
    conn.close()

def prepare_data(dep_var, independents):
    """Mock function to prepare data for processing."""
    dataset_path = 'sto2024_dataset_CLEAN.csv'
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")

    df = pd.read_csv(dataset_path)
    df = df.drop_duplicates()

    # Validate column existence
    missing_columns = [col for col in independents + [dep_var] if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing columns in dataset: {missing_columns}")

    # Handle missing values
    df[independents + [dep_var]] = df[independents + [dep_var]].fillna(0)

    X = df[independents]
    y = df[dep_var]

    return (X, y), (X, y)  # Mock train/test split

@app.route('/api/results', methods=['GET'])
def get_results():
    """Fetch all results from the database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM research_results')
        rows = cursor.fetchall()

        results = [
            {
                'id': row[0],
                'dependent_var': row[1],
                'independent_vars': ', '.join(json.loads(row[2])),  # Comma-separated independents
                'status': row[3],  # Include the processing status
                'results_path': row[4],
                'feature_importance': os.path.join(row[4], 'feature_importance.csv'),
                'model_comparison': os.path.join(row[4], 'model_comparison.csv'),
            }
            for row in rows
        ]

        return jsonify({'data': results}), 200

    except Exception as e:
        print(f"Error in /api/results: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/results/<int:result_id>', methods=['GET'])
def get_result(result_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM research_results WHERE id = ?;', (result_id,))
    result = cursor.fetchone()
    conn.close()
    return jsonify(result) if result else ('Not Found', 404)

@app.route('/metrics', methods=['GET'])
def get_metrics():
    # Get query parameters
    filename = request.args.get('filename', default='model_evaluation', type=str)
    model_names_param = request.args.get('models', default='', type=str)
    result_id = request.args.get('result_id', type=int)

    # Convert models string into a list
    model_names = model_names_param.split(',') if model_names_param else []

    # Connect to the database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Fetch the result from the database
    cursor.execute('SELECT * FROM research_results WHERE id = ?;', (result_id,))
    result = cursor.fetchone()

    if not result:
        return jsonify({'error': 'Result not found'}), 404

    folder_path = result[4]
    all_models_data = {}

    # Check if model_names is empty
    if not model_names:
        # Use the default file path
        if IS_WINDOWS:
            folder_path = folder_path.split('\\')[-1]
            file_path = f'{RESULTS_DIR}/{folder_path}/{filename}.csv'
        else:
            file_path = f'{folder_path}/{filename}.csv' 
        try:
            # Read the CSV file
            df = pd.read_csv(file_path, index_col=0)
            all_models_data['default'] = df.reset_index().to_dict(orient='records')
        except FileNotFoundError:
            return jsonify({'error': f'File not found at path: {file_path}'}), 404
        except pd.errors.EmptyDataError:
            return jsonify({'error': 'CSV file is empty'}), 400
        except Exception as e:
            return jsonify({'error': f'An error occurred: {str(e)}'}), 500
    else:
        # Iterate over model_names and build file paths
        for model in model_names:
            if IS_WINDOWS:
                folder_path = folder_path.split('\\')[-1]
                file_path = f'{RESULTS_DIR}/{folder_path}/{f"{filename}_{model}"}.csv'
            else:
                file_path = f'{folder_path}/{f"{filename}_{model}"}.csv' 
            try:
                # Read the CSV file
                df = pd.read_csv(file_path, index_col=0)
                all_models_data[model] = df.reset_index().to_dict(orient='records')
            except FileNotFoundError:
                all_models_data[model] = {'error': f'File not found at path: {file_path}'}
            except pd.errors.EmptyDataError:
                all_models_data[model] = {'error': 'CSV file is empty'}
            except Exception as e:
                all_models_data[model] = {'error': f'An error occurred: {str(e)}'}

    return jsonify(all_models_data)

@app.route('/api/research-questions', methods=['POST'])
def process_research_questions():
    try:
        data = request.json
        research_questions = data.get("researchQuestions", [])
        if not research_questions:
            return jsonify({"error": "No research questions provided."}), 400

        # Load and preprocess the dataset
        df = pd.read_csv(DATA_FILE)
        df_cleaned = df.copy()

        # Standardize data
        scaler = StandardScaler()
        results_path = RESULTS_DIR
        os.makedirs(results_path, exist_ok=True)

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            processed_questions = []

            for question in research_questions:
                try:
                    dep_var = question.get('dep_var')
                    independents = [col.strip() for col in question.get('independents', []) if col.strip()]

                    if not dep_var or len(independents) < 2:
                        raise ValueError("Invalid question: Missing dependent variable or insufficient independent variables")

                    print(f"Processing question: dep_var={dep_var}, independents={independents}")

                    # Update status to 'starting'
                    cursor.execute('''
                        INSERT INTO research_results (dependent_var, independent_vars, status, results_path)
                        VALUES (?, ?, ?, ?)
                    ''', (dep_var, json.dumps(independents), 'Starting', ''))

                    question_id = cursor.lastrowid
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    analysis_dir = os.path.join(results_path, f"analysis_{timestamp}")
                    os.makedirs(analysis_dir, exist_ok=True)

                    # Prepare data
                    df_cleaned[independents] = scaler.fit_transform(df_cleaned[independents])
                    X = df_cleaned[independents]
                    y = df_cleaned[dep_var]

                    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
                    smote = SMOTE(random_state=42)
                    X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)

                    # Define models and hyperparameters
                    models = {
                        'logistic_regression': LogisticRegression(class_weight='balanced', random_state=42),
                        'random_forest': RandomForestClassifier(class_weight='balanced', random_state=42),
                        'gradient_boosting': GradientBoostingClassifier(random_state=42),
                        'xgboost': XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42)
                    }
                    param_grids = {
                        'random_forest': {
                            'n_estimators': [50, 100, 200],
                            'max_depth': [None, 10, 20],
                            'min_samples_split': [2, 5, 10],
                            'min_samples_leaf': [1, 2, 4]
                        },
                        'xgboost': {
                            'n_estimators': [50, 100, 200],
                            'max_depth': [3, 6, 10],
                            'learning_rate': [0.01, 0.1, 0.3]
                        }
                    }

                    metrics_data = {
                        'accuracy': {}, 'precision': {}, 'recall': {}, 'f1': {}, 'AUROC': {}, 'best_params': {}
                    }
                    best_model_name = None
                    best_f1 = 0

                    # Train models and collect results
                    for model_name, model in models.items():
                        print(f"Training {model_name} for dep_var={dep_var}")
                        if model_name in param_grids:
                            grid_search = GridSearchCV(estimator=model, param_grid=param_grids[model_name], cv=3, n_jobs=-1, verbose=2)
                            grid_search.fit(X_train_resampled, y_train_resampled)
                            model = grid_search.best_estimator_
                            hyperparams = grid_search.best_params_
                        else:
                            model.fit(X_train_resampled, y_train_resampled)
                            hyperparams = "Default"

                        # Predictions
                        y_pred = model.predict(X_test)
                        y_pred_prob = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else None

                        # Metrics
                        accuracy = accuracy_score(y_test, y_pred)
                        precision = precision_score(y_test, y_pred)
                        recall = recall_score(y_test, y_pred)
                        f1 = f1_score(y_test, y_pred)
                        auroc = roc_auc_score(y_test, y_pred_prob) if y_pred_prob is not None else None

                        metrics_data['accuracy'][model_name] = accuracy
                        metrics_data['precision'][model_name] = precision
                        metrics_data['recall'][model_name] = recall
                        metrics_data['f1'][model_name] = f1
                        metrics_data['AUROC'][model_name] = auroc
                        metrics_data['best_params'][model_name] = hyperparams

                        # Track best model
                        if f1 > best_f1:
                            best_f1 = f1
                            best_model_name = model_name

                        # Feature importance
                        if hasattr(model, 'feature_importances_') or hasattr(model, 'coef_'):
                            if hasattr(model, 'feature_importances_'):
                                feature_importance = pd.DataFrame({
                                    'feature': independents,
                                    'importance': model.feature_importances_
                                }).sort_values(by='importance', ascending=False)
                            elif hasattr(model, 'coef_'):
                                feature_importance = pd.DataFrame({
                                    'feature': independents,
                                    'importance': model.coef_[0]
                                }).sort_values(by='importance', ascending=False)
                            feature_file = os.path.join(analysis_dir, f"feature_importance_{model_name}.csv")
                            feature_importance.to_csv(feature_file, index=False)

                    
                    transposed_data = {
                        model_name: {
                            "accuracy": metrics_data['accuracy'].get(model_name, None),
                            "precision": metrics_data['precision'].get(model_name, None),
                            "recall": metrics_data['recall'].get(model_name, None),
                            "f1": metrics_data['f1'].get(model_name, None),
                            "AUROC": metrics_data['AUROC'].get(model_name, None),
                            "best_params": metrics_data['best_params'].get(model_name, None)
                        }
                        for model_name in models.keys()
                    }

                    transposed_df = pd.DataFrame(transposed_data)
                    metrics_file = os.path.join(analysis_dir, "model_evaluation.csv")
                    transposed_df.to_csv(metrics_file, index=True)

                    cursor.execute('''
                        UPDATE research_results
                        SET status = ?, results_path = ?
                        WHERE id = ?
                    ''', ('Success', analysis_dir, question_id))

                    processed_questions.append({
                        "id": question_id,
                        "dependent_var": dep_var,
                        "independent_vars": independents,
                        "status": "Success",
                        "results_path": analysis_dir,
                    })

                except Exception as e:
                    print(f"Error processing question: {e}")
                    cursor.execute('''
                        UPDATE research_results
                        SET status = ?
                        WHERE id = ?
                    ''', ('Error', question_id))
                    continue

            conn.commit()

        return jsonify({"message": "Processing complete.", "processedQuestions": processed_questions}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/download_results/<int:result_id>', methods=['GET'])
def download_results(result_id):
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Fetch the result path using result_id
        cursor.execute('SELECT * FROM research_results WHERE id = ?;', (result_id,))
        result = cursor.fetchone()
        conn.close()

        if not result:
            return jsonify({'error': 'Result not found'}), 404

        # Construct the folder path
        folder_path = result[4]
        ## folder_path = folder_path.split('\\')[-1]
        file_path = ''
        
        if IS_WINDOWS:
            folder_path = folder_path.split('\\')[-1]
            file_path = f'{RESULTS_DIR}/{folder_path}'
        else:
            file_path = f'{folder_path}' 
        
        # Full path to the folder
        folder_full_path = os.path.join(file_path)

        if not os.path.exists(folder_full_path):
            return jsonify({'error': 'Folder not found'}), 404

        # Create a ZIP file from the folder
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(folder_full_path):
                for file in files:
                    # Add file to zip (preserve folder structure)
                    file_path = os.path.join(root, file)
                    zip_file.write(file_path, os.path.relpath(file_path, folder_full_path))

        # Reset buffer position to the beginning
        zip_buffer.seek(0)

        # Send the ZIP file as a response
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'research_results_{result_id}.zip'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5001)
