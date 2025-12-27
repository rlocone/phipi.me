'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
}

const steps = [
  { id: 1, name: 'URL', description: 'Enter article URL' },
  { id: 2, name: 'Process', description: 'Fetch & parse content' },
  { id: 3, name: 'Review', description: 'Edit content' },
  { id: 4, name: 'Metadata', description: 'Categories & tags' },
  { id: 5, name: 'Submit', description: 'Save article' },
];

export function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center relative">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  currentStep > step.id
                    ? 'bg-purple-600 border-purple-600'
                    : currentStep === step.id
                    ? 'bg-purple-600/20 border-purple-500 ring-4 ring-purple-500/20'
                    : 'bg-gray-800/50 border-gray-600'
                )}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      currentStep >= step.id ? 'text-white' : 'text-gray-500'
                    )}
                  >
                    {step.id}
                  </span>
                )}
              </div>
              
              {/* Step Label */}
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    'text-xs font-medium',
                    currentStep >= step.id ? 'text-purple-400' : 'text-gray-500'
                  )}
                >
                  {step.name}
                </p>
                <p className="text-[10px] text-gray-600 hidden lg:block">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 -mt-6">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    currentStep > step.id
                      ? 'bg-purple-600'
                      : 'bg-gray-700'
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
