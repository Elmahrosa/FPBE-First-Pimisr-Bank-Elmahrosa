/**
 * @fileoverview Secure and accessible virtual card creation screen for FPBE mobile banking
 * Implements comprehensive validation, security measures, and enhanced user experience
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.0+
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  AccessibilityInfo,
} from 'react-native'; // v0.71+
import { useDispatch, useSelector } from 'react-redux'; // ^8.0.5
import { useNavigation, useRoute } from '@react-navigation/native'; // ^6.0.0
import { SecurityProvider } from '@security/provider'; // ^2.0.0

import VirtualCard from '../../components/cards/VirtualCard';
import CardControls from '../../components/cards/CardControls';
import Button from '../../components/common/Button';
import { createCard } from '../../store/actions/card.actions';
import { CardType, CardControls as ICardControls } from '../../types/card.types';
import { shared } from '../../styles/colors';
import { SPACING } from '../../styles/spacing';
import { fontSizes, fontWeights } from '../../styles/fonts';
import { COMPONENT_DIMENSIONS } from '../../styles/dimensions';

interface CreateCardScreenProps {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'CreateCard'>;
}

interface CardFormState {
  cardType: CardType;
  spendingLimit: string;
  controls: ICardControls;
  securityConfig: {
    allowInternational: boolean;
    allowOnline: boolean;
    allowAtm: boolean;
  };
}

const initialControls: ICardControls = {
  onlinePurchases: true,
  internationalTransactions: false,
  atmWithdrawals: false,
  contactlessPayments: true,
  recurringPayments: false,
  geoRestrictions: [],
  merchantCategories: [],
  transactionLimits: {
    daily: 1000,
    monthly: 5000,
    perTransaction: 500,
  },
};

const CreateCardScreen: React.FC<CreateCardScreenProps> = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state with validation
  const [formState, setFormState] = useState<CardFormState>({
    cardType: CardType.DEBIT,
    spendingLimit: '',
    controls: initialControls,
    securityConfig: {
      allowInternational: false,
      allowOnline: true,
      allowAtm: false,
    },
  });

  // Preview card data for VirtualCard component
  const previewCardData = useMemo(() => ({
    id: 'preview',
    cardNumber: '•••• •••• •••• ••••',
    cardholderName: 'PREVIEW CARD',
    expiryDate: 'MM/YY',
    cvv: '•••',
    type: formState.cardType,
    status: 'PREVIEW',
    controls: formState.controls,
    spendingLimit: Number(formState.spendingLimit) || 0,
  }), [formState]);

  // Validate spending limit
  const validateSpendingLimit = useCallback((value: string): boolean => {
    const limit = Number(value);
    return !isNaN(limit) && limit >= 100 && limit <= 50000;
  }, []);

  // Handle form submission with security measures
  const handleSubmit = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate spending limit
      if (!validateSpendingLimit(formState.spendingLimit)) {
        throw new Error('Invalid spending limit. Must be between $100 and $50,000');
      }

      // Create card with security context
      const result = await dispatch(createCard({
        type: formState.cardType,
        spendingLimit: Number(formState.spendingLimit),
        currency: 'USD',
        controls: formState.controls,
      })).unwrap();

      // Announce success for accessibility
      AccessibilityInfo.announceForAccessibility('Virtual card created successfully');

      // Navigate to card details
      navigation.navigate('CardDetails', { cardId: result.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create card';
      setError(errorMessage);
      AccessibilityInfo.announceForAccessibility(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, formState, navigation]);

  // Handle control changes
  const handleControlsChange = useCallback((newControls: ICardControls) => {
    setFormState(prev => ({
      ...prev,
      controls: newControls,
    }));
  }, []);

  return (
    <SecurityProvider>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        accessible={true}
        accessibilityLabel="Create virtual card form"
      >
        {/* Card Preview */}
        <View style={styles.previewContainer}>
          <Text style={styles.sectionTitle}>Card Preview</Text>
          <VirtualCard
            card={previewCardData}
            onFlip={() => {}}
            onControlsChange={handleControlsChange}
            securityConfig={formState.securityConfig}
            testID="card-preview"
          />
        </View>

        {/* Card Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Type</Text>
          <View style={styles.cardTypeContainer}>
            {Object.values(CardType).map((type) => (
              <Button
                key={type}
                title={type}
                variant={formState.cardType === type ? 'primary' : 'outline'}
                size="small"
                onPress={() => setFormState(prev => ({ ...prev, cardType: type }))}
                accessibilityLabel={`Select ${type} card type`}
                style={styles.cardTypeButton}
              />
            ))}
          </View>
        </View>

        {/* Spending Limit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Spending Limit</Text>
          <TextInput
            style={styles.input}
            value={formState.spendingLimit}
            onChangeText={(value) => setFormState(prev => ({ ...prev, spendingLimit: value }))}
            keyboardType="numeric"
            placeholder="Enter amount (100-50,000)"
            accessibilityLabel="Enter monthly spending limit"
            accessibilityHint="Enter amount between 100 and 50,000 dollars"
          />
        </View>

        {/* Card Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Controls</Text>
          <CardControls
            cardId="preview"
            controls={formState.controls}
            onUpdate={handleControlsChange}
            loading={false}
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

        {/* Submit Button */}
        <Button
          title="Create Virtual Card"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={!validateSpendingLimit(formState.spendingLimit) || isLoading}
          variant="primary"
          size="large"
          fullWidth
          accessibilityLabel="Create virtual card"
          accessibilityHint="Submit form to create new virtual card"
          style={styles.submitButton}
        />
      </ScrollView>
    </SecurityProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: SPACING.MD,
  },
  previewContainer: {
    marginBottom: SPACING.LG,
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
    marginBottom: SPACING.SM,
    color: shared.primary,
  },
  cardTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.XS,
  },
  cardTypeButton: {
    marginRight: SPACING.XS,
    marginBottom: SPACING.XS,
  },
  input: {
    height: COMPONENT_DIMENSIONS.INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: shared.secondary,
    borderRadius: 8,
    paddingHorizontal: SPACING.MD,
    fontSize: fontSizes.md,
  },
  errorText: {
    color: shared.error,
    fontSize: fontSizes.sm,
    marginBottom: SPACING.MD,
  },
  submitButton: {
    marginTop: SPACING.LG,
  },
});

export default CreateCardScreen;