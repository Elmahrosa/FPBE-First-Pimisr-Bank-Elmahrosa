import React from 'react';
import { View, Text } from 'react-native'; // v0.71+
import { ErrorService } from '../../services/error.service';
import Toast from './Toast';
import { createTheme } from '../../styles/theme';

// Default theme for styling
const theme = createTheme();

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  retryable?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

/**
 * Enhanced React error boundary component with security monitoring,
 * accessibility features, and performance optimizations
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorService: ErrorService;
  private errorDebounceTimer: NodeJS.Timeout | null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
    this.errorService = new ErrorService();
    this.errorDebounceTimer = null;
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo): Promise<void> {
    // Clear any existing error debounce timer
    if (this.errorDebounceTimer) {
      clearTimeout(this.errorDebounceTimer);
    }

    // Update state with error info
    this.setState({
      errorInfo
    });

    // Debounce error handling to prevent rapid repeated errors
    this.errorDebounceTimer = setTimeout(async () => {
      try {
        // Track error with security context and performance metrics
        const startTime = performance.now();
        
        await this.errorService.handleError(error, {
          errorType: 'RUNTIME_ERROR',
          metadata: {
            componentStack: errorInfo.componentStack,
            startTime
          }
        });

        // Show accessible error toast
        Toast({
          message: 'An error occurred. Our team has been notified.',
          type: 'error',
          duration: 5000,
          accessibilityLabel: 'Application error notification'
        });

        // Call custom error handler if provided
        if (this.props.onError) {
          this.props.onError(error, errorInfo);
        }

        // Log performance metric
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (duration > 100) { // Log if exceeds performance requirement
          console.warn(`Error handling took ${duration}ms`);
        }
      } catch (handlingError) {
        // Fallback error handling
        console.error('Error handling failed:', handlingError);
      }
    }, 250); // Debounce time
  }

  handleRetry = (): void => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render(): React.ReactNode {
    const { hasError, retryCount } = this.state;
    const { children, fallback, retryable = true } = this.props;

    if (hasError) {
      // Show custom fallback UI or default error view
      if (fallback) {
        return fallback;
      }

      return (
        <View style={styles.errorContainer}>
          <Text 
            style={styles.errorText}
            accessibilityRole="alert"
            accessibilityLabel="Application error message"
          >
            Something went wrong. Please try again later.
          </Text>
          {retryable && retryCount < 3 && (
            <View
              style={styles.retryButton}
              accessibilityRole="button"
              accessibilityLabel="Retry button"
              accessibilityHint="Attempts to recover from the error"
              onTouchEnd={this.handleRetry}
            >
              <Text style={styles.retryButtonText}>
                Retry
              </Text>
            </View>
          )}
        </View>
      );
    }

    return children;
  }
}

const styles = {
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.MD,
    backgroundColor: theme.colors.background.primary
  },
  errorText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.semantic.feedback.error,
    textAlign: 'center',
    marginTop: theme.spacing.SM,
    fontFamily: theme.typography.platform[Platform.OS].fontFamily
  },
  retryButton: {
    marginTop: theme.spacing.MD,
    padding: theme.spacing.SM,
    backgroundColor: theme.colors.semantic.action.primary,
    borderRadius: theme.spacing.XS,
    minHeight: theme.dimensions.touchTargets.minimum
  },
  retryButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.platform[Platform.OS].fontFamily,
    textAlign: 'center'
  }
};

export default ErrorBoundary;