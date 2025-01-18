/**
 * @fileoverview Enhanced KYC verification screen component implementing secure document
 * capture, real-time validation, and compliance tracking for FPBE mobile banking.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { Jumio } from 'react-native-jumio-sdk'; // v4.0+
import { SecurityUtils } from '@fpbe/security-utils'; // v1.0+
import Button from '../../components/common/Button';
import { KYCStatus } from '../../types/auth.types';
import { useTheme } from '@react-navigation/native';
import type { Theme } from '../../styles/theme';

interface KYCDocument {
  documentType: string;
  encryptedUri: string;
  status: KYCStatus;
  uploadedAt: Date;
  validationResult: string;
  securityMetadata: {
    encryptionVersion: string;
    hashValue: string;
    timestamp: string;
  };
  auditTrail: Array<{
    action: string;
    timestamp: string;
    status: string;
  }>;
}

interface KYCVerificationProps {
  userId: string;
  onStatusChange: (status: KYCStatus) => void;
  onError: (error: Error) => void;
}

const KYCVerification: React.FC<KYCVerificationProps> = ({
  userId,
  onStatusChange,
  onError,
}) => {
  const theme = useTheme() as Theme;
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [currentStatus, setCurrentStatus] = useState<KYCStatus>(KYCStatus.PENDING);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const jumioRef = useRef<Jumio | null>(null);

  // Initialize Jumio SDK with security configurations
  useEffect(() => {
    const initializeJumio = async () => {
      try {
        jumioRef.current = await Jumio.initialize({
          apiKey: process.env.JUMIO_API_KEY,
          apiSecret: process.env.JUMIO_API_SECRET,
          dataCenter: 'US',
          enableVerification: true,
          enableEncryption: true,
        });

        // Set accessibility focus on initialization
        AccessibilityInfo.announceForAccessibility('KYC verification screen ready');
      } catch (err) {
        setError('Failed to initialize verification system');
        onError(err as Error);
      }
    };

    initializeJumio();

    return () => {
      jumioRef.current?.cleanup();
    };
  }, [onError]);

  // Handle secure document capture with encryption
  const handleDocumentCapture = useCallback(async (documentType: string, options: object) => {
    try {
      setIsLoading(true);

      // Verify device security status
      const securityCheck = await SecurityUtils.verifyDeviceIntegrity();
      if (!securityCheck.isSecure) {
        throw new Error('Device security requirements not met');
      }

      // Initialize secure camera session
      const scanResult = await jumioRef.current?.startDocumentScanning({
        type: documentType,
        ...options,
        enableSecureCapture: true,
      });

      if (!scanResult?.documentUri) {
        throw new Error('Document capture failed');
      }

      // Encrypt document immediately after capture
      const encryptedDocument = await SecurityUtils.encryptDocument({
        uri: scanResult.documentUri,
        userId,
        documentType,
        timestamp: new Date().toISOString(),
      });

      // Create document record with audit trail
      const newDocument: KYCDocument = {
        documentType,
        encryptedUri: encryptedDocument.uri,
        status: KYCStatus.IN_PROGRESS,
        uploadedAt: new Date(),
        validationResult: 'pending',
        securityMetadata: {
          encryptionVersion: encryptedDocument.version,
          hashValue: encryptedDocument.hash,
          timestamp: encryptedDocument.timestamp,
        },
        auditTrail: [{
          action: 'DOCUMENT_CAPTURED',
          timestamp: new Date().toISOString(),
          status: 'success',
        }],
      };

      setDocuments(prev => [...prev, newDocument]);
      return newDocument;

    } catch (err) {
      setError('Document capture failed. Please try again.');
      onError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userId, onError]);

  // Handle KYC submission with compliance checks
  const handleSubmitKYC = useCallback(async () => {
    try {
      setIsLoading(true);

      // Validate all required documents
      if (documents.length < 2) {
        throw new Error('Please capture all required documents');
      }

      // Perform compliance pre-checks
      const complianceCheck = await SecurityUtils.verifyComplianceRequirements({
        userId,
        documents,
        requirements: ['FinCEN', 'GDPR'],
      });

      if (!complianceCheck.isCompliant) {
        throw new Error(complianceCheck.reason);
      }

      // Submit documents through secure channel
      const submission = await SecurityUtils.submitKYCDocuments({
        userId,
        documents,
        metadata: {
          timestamp: new Date().toISOString(),
          deviceInfo: Platform.select({
            ios: 'iOS',
            android: 'Android',
          }),
        },
      });

      // Update status and notify parent
      setCurrentStatus(KYCStatus.IN_PROGRESS);
      onStatusChange(KYCStatus.IN_PROGRESS);

      return submission;

    } catch (err) {
      setError('KYC submission failed. Please try again.');
      onError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [documents, userId, onStatusChange, onError]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessibilityRole="main"
      accessibilityLabel="KYC Verification Screen"
    >
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Identity Verification
      </Text>

      <View style={styles.documentSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
          Required Documents
        </Text>

        <Button
          title="Capture ID Document"
          onPress={() => handleDocumentCapture('ID_DOCUMENT', {
            enableHighResolution: true,
            enableFaceDetection: true,
          })}
          disabled={isLoading || currentStatus !== KYCStatus.PENDING}
          loading={isLoading}
          variant="primary"
          accessibilityLabel="Capture ID Document"
        />

        <Button
          title="Capture Proof of Address"
          onPress={() => handleDocumentCapture('PROOF_OF_ADDRESS', {
            enableHighResolution: true,
          })}
          disabled={isLoading || currentStatus !== KYCStatus.PENDING}
          loading={isLoading}
          variant="primary"
          style={styles.buttonSpacing}
          accessibilityLabel="Capture Proof of Address"
        />
      </View>

      {documents.length > 0 && (
        <View style={styles.documentList}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            Uploaded Documents
          </Text>
          {documents.map((doc, index) => (
            <View key={index} style={styles.documentItem}>
              <Text style={[styles.documentType, { color: theme.colors.text.primary }]}>
                {doc.documentType}
              </Text>
              <Text style={[styles.documentStatus, { color: theme.colors.semantic.status[doc.status.toLowerCase()] }]}>
                {doc.status}
              </Text>
            </View>
          ))}
        </View>
      )}

      {error && (
        <Text style={[styles.errorText, { color: theme.colors.semantic.feedback.error }]}>
          {error}
        </Text>
      )}

      <Button
        title="Submit Verification"
        onPress={handleSubmitKYC}
        disabled={isLoading || documents.length < 2 || currentStatus !== KYCStatus.PENDING}
        loading={isLoading}
        variant="primary"
        style={styles.submitButton}
        accessibilityLabel="Submit Verification Documents"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  documentSection: {
    marginVertical: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 12,
  },
  buttonSpacing: {
    marginTop: 12,
  },
  documentList: {
    marginTop: 24,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginBottom: 8,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '500',
  },
  documentStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 24,
  },
});

export default KYCVerification;