/**
 * @fileoverview CardControls component for managing virtual card settings
 * Implements secure control toggles with validation, accessibility, and error handling
 * @version 1.0.0
 */

import React, { useCallback, useState, useEffect } from 'react'; // v18.0+
import { View, Switch, StyleSheet, AccessibilityInfo } from 'react-native'; // v0.71+
import { useDispatch } from 'react-redux'; // ^8.0.5
import debounce from 'lodash/debounce'; // ^4.17.21
import Dialog from '@material-ui/core/Dialog'; // ^4.12.4

import { CardControls as ICardControls, CardControlValidation } from '../../types/card.types';
import { updateCard, UpdateCardError } from '../../store/actions/card.actions';
import Button from '../common/Button';
import { shared } from '../../styles/colors';
import { SPACING } from '../../styles/spacing';
import { fontSizes, fontWeights } from '../../styles/fonts';

interface CardControlsProps {
  cardId: string;
  controls: ICardControls;
  onUpdate: (controls: ICardControls) => Promise<void>;
  onError: (error: UpdateCardError) => void;
  loading?: boolean;
  validation?: CardControlValidation;
}

/**
 * CardControls component for managing virtual card settings
 * Implements WCAG 2.1 AA accessibility standards and secure validation
 */
export const CardControls = React.memo<CardControlsProps>(({
  cardId,
  controls,
  onUpdate,
  onError,
  loading = false,
  validation,
}) => {
  const dispatch = useDispatch();
  const [localControls, setLocalControls] = useState<ICardControls>(controls);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    control: string;
    value: boolean;
  }>({ open: false, control: '', value: false });
  const [error, setError] = useState<string | null>(null);

  // Debounced update handler to prevent rapid API calls
  const debouncedUpdate = useCallback(
    debounce(async (newControls: ICardControls) => {
      try {
        await onUpdate(newControls);
        setError(null);
      } catch (err) {
        const error = err as UpdateCardError;
        setError(error.message);
        onError(error);
      }
    }, 500),
    [onUpdate, onError]
  );

  // Setup accessibility announcements
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      'Card control settings available. Use switches to toggle settings.'
    );
  }, []);

  // Handle control toggle with validation and confirmation
  const handleControlChange = useCallback(async (
    controlName: keyof ICardControls,
    value: boolean
  ) => {
    // Validate control change if validation rules exist
    if (validation?.[controlName]) {
      const validationResult = validation[controlName](value);
      if (!validationResult.valid) {
        setError(validationResult.message);
        return;
      }
    }

    // Show confirmation dialog for sensitive controls
    const sensitiveControls = ['internationalTransactions', 'atmWithdrawals'];
    if (sensitiveControls.includes(controlName)) {
      setConfirmDialog({ open: true, control: controlName, value });
      return;
    }

    // Update controls
    const newControls = {
      ...localControls,
      [controlName]: value,
    };
    setLocalControls(newControls);
    debouncedUpdate(newControls);
  }, [localControls, validation, debouncedUpdate]);

  // Handle confirmation dialog response
  const handleConfirmation = useCallback(async (confirmed: boolean) => {
    if (confirmed) {
      const newControls = {
        ...localControls,
        [confirmDialog.control]: confirmDialog.value,
      };
      setLocalControls(newControls);
      debouncedUpdate(newControls);
    }
    setConfirmDialog({ open: false, control: '', value: false });
  }, [confirmDialog, localControls, debouncedUpdate]);

  return (
    <View style={styles.container}>
      {/* Online Purchases Control */}
      <View style={styles.controlRow}>
        <View accessible={true} accessibilityRole="text">
          <Text style={styles.label}>Online Purchases</Text>
        </View>
        <Switch
          value={localControls.onlinePurchases}
          onValueChange={(value) => handleControlChange('onlinePurchases', value)}
          accessibilityLabel="Toggle online purchases"
          accessibilityHint="Enables or disables online purchases with this card"
          disabled={loading}
          trackColor={{ false: '#767577', true: shared.primary }}
        />
      </View>

      {/* International Transactions Control */}
      <View style={styles.controlRow}>
        <View accessible={true} accessibilityRole="text">
          <Text style={styles.label}>International Transactions</Text>
        </View>
        <Switch
          value={localControls.internationalTransactions}
          onValueChange={(value) => handleControlChange('internationalTransactions', value)}
          accessibilityLabel="Toggle international transactions"
          accessibilityHint="Enables or disables international transactions with this card"
          disabled={loading}
          trackColor={{ false: '#767577', true: shared.primary }}
        />
      </View>

      {/* ATM Withdrawals Control */}
      <View style={styles.controlRow}>
        <View accessible={true} accessibilityRole="text">
          <Text style={styles.label}>ATM Withdrawals</Text>
        </View>
        <Switch
          value={localControls.atmWithdrawals}
          onValueChange={(value) => handleControlChange('atmWithdrawals', value)}
          accessibilityLabel="Toggle ATM withdrawals"
          accessibilityHint="Enables or disables ATM withdrawals with this card"
          disabled={loading}
          trackColor={{ false: '#767577', true: shared.primary }}
        />
      </View>

      {/* Error Display */}
      {error && (
        <Text 
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => handleConfirmation(false)}
        aria-labelledby="control-confirmation-dialog"
      >
        <View style={styles.dialogContent}>
          <Text style={styles.dialogTitle}>
            Confirm Changes
          </Text>
          <Text style={styles.dialogMessage}>
            Are you sure you want to {confirmDialog.value ? 'enable' : 'disable'} {
              confirmDialog.control.replace(/([A-Z])/g, ' $1').toLowerCase()
            }?
          </Text>
          <View style={styles.dialogButtons}>
            <Button
              title="Cancel"
              onPress={() => handleConfirmation(false)}
              variant="outline"
              size="small"
              accessibilityLabel="Cancel changes"
            />
            <Button
              title="Confirm"
              onPress={() => handleConfirmation(true)}
              variant="primary"
              size="small"
              accessibilityLabel="Confirm changes"
            />
          </View>
        </View>
      </Dialog>
    </View>
  );
});

CardControls.displayName = 'CardControls';

const styles = StyleSheet.create({
  container: {
    padding: SPACING.MD,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.XS,
    paddingVertical: SPACING.XS,
  },
  label: {
    fontSize: fontSizes.md,
    color: '#333333',
    fontWeight: fontWeights.medium,
    flex: 1,
    marginRight: SPACING.MD,
  },
  errorText: {
    color: shared.error,
    fontSize: fontSizes.sm,
    marginTop: SPACING.XS,
  },
  dialogContent: {
    padding: SPACING.LG,
  },
  dialogTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    marginBottom: SPACING.MD,
  },
  dialogMessage: {
    fontSize: fontSizes.md,
    marginBottom: SPACING.LG,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.SM,
  },
});

export default CardControls;