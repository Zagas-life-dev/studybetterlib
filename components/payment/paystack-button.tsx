"use client";

import { useState } from 'react';
import { Button } from '../ui/button';
import { usePaystackPayment } from '@/hooks/use-paystack';

interface PaystackButtonProps {
  email: string;
  amount: number;
  metadata?: Record<string, any>;
  currency?: string;
  className?: string;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export const PaystackButton: React.FC<PaystackButtonProps> = ({
  email,
  amount,
  metadata,
  currency = 'NGN',
  className,
  onSuccess,
  onCancel,
  children,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { initializePayment } = usePaystackPayment();

  const handlePayment = () => {
    setIsProcessing(true);
    
    // Generate a unique reference
    const reference = `pay_${Math.random().toString(36).substring(2)}${Date.now()}`;
    
    initializePayment({
      email,
      amount,
      reference,
      currency,
      metadata,
      onSuccess: (ref) => {
        setIsProcessing(false);
        onSuccess(ref);
      },
      onCancel: () => {
        setIsProcessing(false);
        onCancel();
      }
    });
  };

  return (
    <Button 
      onClick={handlePayment} 
      disabled={isProcessing}
      className={className}
    >
      {isProcessing ? 'Processing...' : children}
    </Button>
  );
};