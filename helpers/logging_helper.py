import logging
import os
import traceback
from flask import Flask, request, jsonify

class LoggingHelper:
    def __init__(self, log_dir='logs', log_file='logs.txt'):
        """
        Initialize the logging helper with the log directory and file name.
        """
        self.log_dir = log_dir
        self.log_file = log_file
        self._configure_logging()

    def _configure_logging(self):
        """
        Configure the logging system by creating the necessary directory and setting up logging parameters.
        """
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir)
        logging.basicConfig(
            filename=os.path.join(self.log_dir, self.log_file),
            level=logging.DEBUG,  # Set to DEBUG for more detailed logs
            format='%(asctime)s - %(levelname)s - %(name)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

    def log_info(self, message):
        """
        Log an informational message.
        """
        self.logger.info(message)

    def log_warning(self, message):
        """
        Log a warning message.
        """
        self.logger.warning(message)

    def log_error(self, message, exc_info=False):
        """
        Log an error message, optionally including exception information.
        """
        if exc_info:
            self.logger.error(f"{message}", exc_info=True)
            self.logger.debug(f"Traceback: {traceback.format_exc()}")
        else:
            self.logger.error(message)

    def log_debug(self, message):
        """
        Log a debug message for detailed debugging information.
        """
        self.logger.debug(message)

    def log_request(self, method, endpoint, params=None, status_code=None):
        """
        Log details of a request, including method, endpoint, parameters, and status code if available.
        Adds extra information for better traceability.
        """
        log_message = f"Request: {method} {endpoint}"
        if params:
            log_message += f" | Params: {params}"
        if status_code:
            log_message += f" | Status: {status_code}"
        self.logger.info(log_message)
        """
        Log details of a request, including method, endpoint, parameters, and status code if available.
        """
        log_message = f"Request: {method} {endpoint}"
        if params:
            log_message += f" | Params: {params}"
        if status_code:
            log_message += f" | Status: {status_code}"
        self.logger.info(log_message)

    def log_from_frontend(self, level, message):
        """
        Log a message received from the frontend (JavaScript).
        """
        log_methods = {
            'info': self.log_info,
            'warning': self.log_warning,
            'error': self.log_error,
            'debug': self.log_debug
        }
        log_method = log_methods.get(level, self.logger.error)
        log_method(f"Frontend: {message}")
        self.logger.debug(f"Frontend log received with level '{level}' and message: {message}")
        """
        Log a message received from the frontend (JavaScript).
        """
        log_methods = {
            'info': self.log_info,
            'warning': self.log_warning,
            'error': self.log_error,
            'debug': self.log_debug
        }
        log_method = log_methods.get(level, self.logger.error)
        log_method(f"Frontend: {message}")

# Flask endpoint to capture frontend logs
app = Flask(__name__)
logger = LoggingHelper()

@app.route('/log', methods=['POST'])
def log_from_frontend():
    data = request.json
    level = data.get('level')
    message = data.get('message')
    if level and message:
        logger.log_from_frontend(level, message)
        return jsonify({'status': 'success'}), 200
    else:
        logger.log_warning("Invalid log request from frontend: missing 'level' or 'message'.")
        return jsonify({'error': 'Invalid log request'}), 400

# Example usage
if __name__ == "__main__":
    logger.log_info("Logging system initialized.")
    logger.log_debug("This is a debug message for detailed tracing.")
    try:
        # Simulate an error
        raise ValueError("An example error")
    except ValueError as e:
        logger.log_error("An error occurred", exc_info=True)
    app.run(debug=True, use_reloader=False)
