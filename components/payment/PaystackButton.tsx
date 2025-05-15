"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { usePaystackPayment } from "@/hooks/use-paystack";
import { useToast } from "@/hooks/use-toast";

interface PaystackButtonProps {
  amount: number; // amount in kobo (smallest currency unit)
  email: string;
  metadata?: {
    [key: string]: any;
  };
  reference?: string;
  currency?: "NGN" | "GHS" | "USD" | "ZAR";
  className?: string;
  onSuccess?: (reference: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  buttonText?: string;
}

export function PaystackButton({
  amount,
  email,
  metadata = {},
  reference,
  currency = "NGN",
  className,
  onSuccess,
  onCancel,
  disabled = false,
  buttonText = "Pay Now"
}: PaystackButtonProps) {
  const { toast } = useToast();
  const [paymentRef, setPaymentRef] = useState(reference || "");
  const { initializePayment } = usePaystackPayment();

  // Generate a reference if not provided
  useEffect(() => {
    if (!reference) {
      setPaymentRef(`ref_${Math.floor(Math.random() * 1000000000)}_${Date.now()}`);
    }
  }, [reference]);

  const handlePayment = () => {
    if (disabled) return;

    const config = {
      email,
      amount,
      reference: paymentRef,
      currency,
      metadata,
      onSuccess: (reference: string) => {
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
        });
        
        if (onSuccess) onSuccess(reference);
      },
      onCancel: () => {
        toast({
          title: "Payment Cancelled",
          description: "You've cancelled the payment.",
          variant: "destructive",
        });
        
        if (onCancel) onCancel();
      },
    };

    initializePayment(config);
  };

  return (
    <Button 
      onClick={handlePayment} 
      disabled={disabled}
      className={className}
    >
      {buttonText}
    </Button>
  );
}