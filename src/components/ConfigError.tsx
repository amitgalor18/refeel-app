

const ConfigError = () => {
    return (
        <div className="fixed inset-0 bg-red-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full border-l-4 border-red-500">
                <h1 className="text-2xl font-bold text-red-600 mb-4">
                    Missing Configuration
                </h1>

                <div className="space-y-4 text-gray-700">
                    <p className="font-semibold">
                        CRITICAL ERROR: Firebase configuration is missing.
                    </p>

                    <div className="bg-gray-100 p-4 rounded text-sm font-mono overflow-x-auto">
                        <p className="mb-2 text-gray-500">// Check your console for more details</p>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-bold text-gray-900">If you are running locally:</h3>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Make sure you have a <code className="bg-gray-100 px-1 rounded">.env</code> file in the root folder.</li>
                            <li>Check that <code className="bg-gray-100 px-1 rounded">VITE_API_KEY</code> and other variables are defined in it.</li>
                        </ol>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-bold text-gray-900">If you are deploying:</h3>
                        <p className="ml-2">
                            Make sure you have added the Environment Variables in your deployment settings (e.g., Vercel, Netlify).
                        </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfigError;
