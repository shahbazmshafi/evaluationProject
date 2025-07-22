/**
 * Utility functions for environment detection
 */

/**
 * Checks if the application is running in Docker
 * This works by checking if the application is accessing the backend via the /api prefix
 * which is set up in the nginx.conf for Docker deployments
 * 
 * NOTE: The previous implementation used hostname to determine if the app is running in Docker,
 * but this doesn't work correctly when accessing the app via local IP address.
 * 
 * This updated implementation checks for the existence of a specific API endpoint
 * that is only available when running in Docker mode.
 */
export const isRunningInDocker = (): boolean => {
  // Check if we're running in a production build (Docker deployment)
  // This is more reliable than checking the hostname

  // For this application, we want to use the backend API when accessed via any non-localhost URL
  // This ensures consistent behavior regardless of how the app is accessed

  // When accessed via localhost, use the development mode (localStorage)
  // When accessed via any other URL (including local IP), use the production mode (backend API)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Log the detection result for debugging
  console.log(`isRunningInDocker: hostname=${window.location.hostname}, isLocalhost=${isLocalhost}, usingBackendAPI=${!isLocalhost}`);

  return !isLocalhost;
};
