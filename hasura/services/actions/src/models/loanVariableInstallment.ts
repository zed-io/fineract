import { PeriodFrequencyType } from './loan';

/**
 * Configuration for variable installment loans
 */
export interface VariableInstallmentConfig {
  allowVariableInstallments: boolean;
  minimumGap: number;
  minimumGapFrequencyType: PeriodFrequencyType;
  maximumGap: number;
  maximumGapFrequencyType: PeriodFrequencyType;
  minimumInstallmentAmount?: number;
}

/**
 * An installment in a variable installment loan schedule
 */
export interface VariableInstallment {
  installmentNumber: number;
  fromDate: Date;
  dueDate: Date;
  installmentAmount?: number;
  // Optional principal override (if null, calculated based on installment amount)
  principal?: number;
  // Optional interest override (if null, calculated based on standard interest formulas)
  interest?: number;
}

/**
 * Validates variable installment configuration
 * @param config The variable installment configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateVariableInstallmentConfig(config: VariableInstallmentConfig): void {
  if (!config.allowVariableInstallments) {
    return; // No need to validate further if variable installments are not allowed
  }

  if (config.minimumGap <= 0) {
    throw new Error('Minimum gap must be greater than zero');
  }

  if (config.maximumGap <= 0) {
    throw new Error('Maximum gap must be greater than zero');
  }

  if (config.maximumGap < config.minimumGap) {
    throw new Error('Maximum gap must be greater than or equal to minimum gap');
  }

  // Validate gap frequency types
  const validFrequencyTypes = Object.values(PeriodFrequencyType);
  if (!validFrequencyTypes.includes(config.minimumGapFrequencyType)) {
    throw new Error(`Invalid minimum gap frequency type: ${config.minimumGapFrequencyType}`);
  }

  if (!validFrequencyTypes.includes(config.maximumGapFrequencyType)) {
    throw new Error(`Invalid maximum gap frequency type: ${config.maximumGapFrequencyType}`);
  }

  // Validate minimum installment amount if provided
  if (config.minimumInstallmentAmount !== undefined && config.minimumInstallmentAmount <= 0) {
    throw new Error('Minimum installment amount must be greater than zero');
  }
}

/**
 * Converts gaps to days based on frequency type
 * @param gap The gap value
 * @param frequencyType The frequency type
 * @returns The gap in days
 */
export function gapToDays(gap: number, frequencyType: PeriodFrequencyType): number {
  switch (frequencyType) {
    case PeriodFrequencyType.DAYS:
      return gap;
    case PeriodFrequencyType.WEEKS:
      return gap * 7;
    case PeriodFrequencyType.MONTHS:
      return gap * 30; // Approximate
    case PeriodFrequencyType.YEARS:
      return gap * 365; // Approximate
    default:
      throw new Error(`Unsupported frequency type: ${frequencyType}`);
  }
}

/**
 * Validates variable installment due dates against configured constraints
 * @param installments The array of variable installments to validate
 * @param config The variable installment configuration
 * @param expectedDisbursementDate The expected disbursement date
 * @throws Error if installments don't meet configured constraints
 */
export function validateVariableInstallments(
  installments: VariableInstallment[],
  config: VariableInstallmentConfig,
  expectedDisbursementDate: Date
): void {
  if (!config.allowVariableInstallments) {
    throw new Error('Variable installments are not allowed for this loan');
  }

  if (!installments.length) {
    throw new Error('No installments provided');
  }

  // Sort installments by due date
  installments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  // Validate installment amounts
  if (config.minimumInstallmentAmount !== undefined) {
    for (const installment of installments) {
      if (installment.installmentAmount !== undefined && 
          installment.installmentAmount < config.minimumInstallmentAmount) {
        throw new Error(
          `Installment ${installment.installmentNumber} amount ${installment.installmentAmount} ` +
          `is less than the minimum allowed amount ${config.minimumInstallmentAmount}`
        );
      }
    }
  }

  // Validate gaps between installments
  const minimumGapDays = gapToDays(config.minimumGap, config.minimumGapFrequencyType);
  const maximumGapDays = gapToDays(config.maximumGap, config.maximumGapFrequencyType);

  let previousDate = expectedDisbursementDate;

  for (const installment of installments) {
    const daysSincePreviousDate = Math.round(
      (installment.dueDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePreviousDate < minimumGapDays) {
      throw new Error(
        `Gap between installment ${installment.installmentNumber} and previous date ` +
        `(${daysSincePreviousDate} days) is less than the minimum allowed gap (${minimumGapDays} days)`
      );
    }

    if (daysSincePreviousDate > maximumGapDays) {
      throw new Error(
        `Gap between installment ${installment.installmentNumber} and previous date ` +
        `(${daysSincePreviousDate} days) is greater than the maximum allowed gap (${maximumGapDays} days)`
      );
    }

    previousDate = installment.dueDate;
  }
}