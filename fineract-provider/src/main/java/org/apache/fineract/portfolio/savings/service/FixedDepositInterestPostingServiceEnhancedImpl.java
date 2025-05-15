/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package org.apache.fineract.portfolio.savings.service;

import java.math.MathContext;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.fineract.infrastructure.configuration.domain.ConfigurationDomainService;
import org.apache.fineract.infrastructure.core.exception.PlatformDataIntegrityException;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.infrastructure.event.business.domain.deposit.FixedDepositAccrualBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.deposit.FixedDepositInterestPostingBusinessEvent;
import org.apache.fineract.infrastructure.event.business.domain.deposit.FixedDepositMaturityBusinessEvent;
import org.apache.fineract.infrastructure.event.business.service.BusinessEventNotifierService;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.account.PortfolioAccountType;
import org.apache.fineract.portfolio.account.data.AccountTransferDTO;
import org.apache.fineract.portfolio.account.service.AccountTransfersWritePlatformService;
import org.apache.fineract.portfolio.savings.DepositAccountOnClosureType;
import org.apache.fineract.portfolio.savings.data.FixedDepositAccountData;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccount;
import org.apache.fineract.portfolio.savings.domain.FixedDepositAccountRepository;
import org.apache.fineract.portfolio.savings.domain.FixedDepositTransaction;
import org.apache.fineract.portfolio.savings.domain.FixedDepositTransactionRepository;
import org.apache.fineract.portfolio.savings.domain.SavingsAccountRepository;
import org.apache.fineract.portfolio.savings.domain.SavingsAccountTransaction;
import org.apache.fineract.portfolio.savings.domain.SavingsAccountTransactionRepository;
import org.apache.fineract.portfolio.savings.exception.FixedDepositAccountNotFoundException;
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationEvent;
import org.apache.fineract.portfolio.savings.service.notifications.SavingsNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Enhanced implementation of FixedDepositAccountInterestPostingService that provides
 * more comprehensive interest calculation and posting for fixed deposit accounts.
 */
@Service
public class FixedDepositInterestPostingServiceEnhancedImpl implements FixedDepositAccountInterestPostingService {

    private static final Logger LOG = LoggerFactory.getLogger(FixedDepositInterestPostingServiceEnhancedImpl.class);
    
    private final FixedDepositAccountRepository fixedDepositAccountRepository;
    private final SavingsAccountRepository savingsAccountRepository;
    private final SavingsAccountTransactionRepository savingsAccountTransactionRepository;
    private final FixedDepositTransactionRepository fixedDepositTransactionRepository;
    private final FixedDepositInterestCalculator fixedDepositInterestCalculator;
    private final ConfigurationDomainService configurationDomainService;
    private final BusinessEventNotifierService businessEventNotifierService;
    private final SavingsNotificationService savingsNotificationService;
    private final AccountTransfersWritePlatformService accountTransfersWritePlatformService;
    private final FixedDepositAccountReadPlatformService fixedDepositAccountReadPlatformService;
    
    @Autowired
    public FixedDepositInterestPostingServiceEnhancedImpl(
            FixedDepositAccountRepository fixedDepositAccountRepository,
            SavingsAccountRepository savingsAccountRepository,
            SavingsAccountTransactionRepository savingsAccountTransactionRepository,
            FixedDepositTransactionRepository fixedDepositTransactionRepository,
            FixedDepositInterestCalculator fixedDepositInterestCalculator,
            ConfigurationDomainService configurationDomainService,
            BusinessEventNotifierService businessEventNotifierService,
            SavingsNotificationService savingsNotificationService,
            AccountTransfersWritePlatformService accountTransfersWritePlatformService,
            FixedDepositAccountReadPlatformService fixedDepositAccountReadPlatformService) {
        this.fixedDepositAccountRepository = fixedDepositAccountRepository;
        this.savingsAccountRepository = savingsAccountRepository;
        this.savingsAccountTransactionRepository = savingsAccountTransactionRepository;
        this.fixedDepositTransactionRepository = fixedDepositTransactionRepository;
        this.fixedDepositInterestCalculator = fixedDepositInterestCalculator;
        this.configurationDomainService = configurationDomainService;
        this.businessEventNotifierService = businessEventNotifierService;
        this.savingsNotificationService = savingsNotificationService;
        this.accountTransfersWritePlatformService = accountTransfersWritePlatformService;
        this.fixedDepositAccountReadPlatformService = fixedDepositAccountReadPlatformService;
    }

    @Override
    @Transactional
    public Money postInterest(UUID accountId, LocalDate postingDate) {
        try {
            final FixedDepositAccount account = this.fixedDepositAccountRepository.findById(accountId.toString())
                    .orElseThrow(() -> new FixedDepositAccountNotFoundException(accountId));
            
            // Do not post interest if account is not active
            if (!account.isActive()) {
                return Money.zero(account.getCurrency());
            }
            
            // Get the math context for calculations
            final MathContext mc = MathContext.DECIMAL64;
            
            // Calculate interest posting up to date
            final LocalDate interestPostingUpToDate = calculateInterestPostingUpToDate(postingDate, account);
            
            // Get settings from configuration
            final boolean isSavingsInterestPostingAtCurrentPeriodEnd = this.configurationDomainService
                    .isSavingsInterestPostingAtCurrentPeriodEnd();
            final Integer financialYearBeginningMonth = this.configurationDomainService.retrieveFinancialYearBeginningMonth();
            
            // Calculate interest amount
            Money interestAmount = this.fixedDepositInterestCalculator.calculateInterest(
                    account, account.depositStartDate(), interestPostingUpToDate, mc, false);
            
            if (interestAmount.isGreaterThanZero()) {
                // Create interest posting transaction
                SavingsAccountTransaction interestPostingTxn = account.addInterestPosting(interestAmount, interestPostingUpToDate);
                this.savingsAccountTransactionRepository.save(interestPostingTxn);
                
                // Create corresponding fixed deposit transaction
                FixedDepositTransaction fixedDepositTxn = FixedDepositTransaction.createNew(
                        interestPostingTxn, account, "interest_posting", interestAmount.getAmount(),
                        interestAmount.getAmount(), Money.zero(account.getCurrency()).getAmount(),
                        Money.zero(account.getCurrency()).getAmount(), Money.zero(account.getCurrency()).getAmount(),
                        account.getAccountBalance(), false);
                this.fixedDepositTransactionRepository.save(fixedDepositTxn);
                
                // Update account summary
                account.updateInterestEarned(interestAmount.getAmount());
                account.updateMaturityAmount(calculateMaturityAmount(account, mc, false).getAmount());
                this.fixedDepositAccountRepository.save(account);
                
                // Fire business event
                this.businessEventNotifierService.notifyPostBusinessEvent(
                        new FixedDepositInterestPostingBusinessEvent(account, interestPostingTxn));
                
                // Send notification
                this.savingsNotificationService.notifyAccountOwnerOfInterestPosting(account, interestAmount.getAmount(),
                        SavingsNotificationEvent.INTEREST_POSTING);
                
                // If interest transfer is enabled, transfer the interest amount
                if (account.isTransferInterestToOtherAccount() && account.getTransferToSavingsAccountId() != null) {
                    handleInterestTransfer(account, interestPostingTxn);
                }
                
                return interestAmount;
            }
            
            return Money.zero(account.getCurrency());
            
        } catch (final FixedDepositAccountNotFoundException e) {
            throw e;
        } catch (final Exception e) {
            LOG.error("Error posting interest to fixed deposit account: {}", accountId, e);
            throw new PlatformDataIntegrityException("error.msg.fixed.deposit.interest.posting.failed",
                    "Error posting interest to fixed deposit account " + accountId, e);
        }
    }

    @Override
    @Transactional
    public int postInterestForAccounts(Collection<FixedDepositAccountData> accounts, LocalDate postingDate) {
        if (accounts == null || accounts.isEmpty()) {
            return 0;
        }
        
        int successCount = 0;
        
        for (FixedDepositAccountData accountData : accounts) {
            try {
                if (accountData.getId() != null) {
                    UUID accountId = UUID.fromString(accountData.getId().toString());
                    postInterest(accountId, postingDate);
                    successCount++;
                }
            } catch (Exception e) {
                LOG.error("Error posting interest for account {}: {}", accountData.getAccountNo(), e.getMessage());
                // Continue with the next account even if there's an error
            }
        }
        
        return successCount;
    }

    @Override
    @Transactional
    public Money accrueInterest(UUID accountId, LocalDate accrualDate) {
        try {
            final FixedDepositAccount account = this.fixedDepositAccountRepository.findById(accountId.toString())
                    .orElseThrow(() -> new FixedDepositAccountNotFoundException(accountId));
            
            // Do not accrue interest if account is not active
            if (!account.isActive()) {
                return Money.zero(account.getCurrency());
            }
            
            // Get the math context for calculations
            final MathContext mc = MathContext.DECIMAL64;
            
            // Calculate accrued interest from the last accrual date (or deposit start date)
            LocalDate lastAccrualDate = getLastAccrualDate(account);
            LocalDate fromDate = lastAccrualDate != null ? lastAccrualDate.plusDays(1) : account.depositStartDate();
            
            // Don't accrue if already accrued for this date or if accrual date is before from date
            if (accrualDate.isBefore(fromDate)) {
                return Money.zero(account.getCurrency());
            }
            
            // Calculate interest to be accrued
            Money interestToAccrue = this.fixedDepositInterestCalculator.calculateInterest(
                    account, fromDate, accrualDate, mc, false);
            
            if (interestToAccrue.isGreaterThanZero()) {
                // Create accrual transaction
                SavingsAccountTransaction accrualTxn = account.addAccrualTransaction(interestToAccrue, accrualDate);
                this.savingsAccountTransactionRepository.save(accrualTxn);
                
                // Fire business event
                this.businessEventNotifierService.notifyPostBusinessEvent(
                        new FixedDepositAccrualBusinessEvent(account, accrualTxn));
                
                return interestToAccrue;
            }
            
            return Money.zero(account.getCurrency());
            
        } catch (final Exception e) {
            LOG.error("Error accruing interest for fixed deposit account: {}", accountId, e);
            throw new PlatformDataIntegrityException("error.msg.fixed.deposit.interest.accrual.failed",
                    "Error accruing interest for fixed deposit account " + accountId, e);
        }
    }

    @Override
    @Transactional
    public int accrueInterestForAccounts(Collection<FixedDepositAccountData> accounts, LocalDate accrualDate) {
        if (accounts == null || accounts.isEmpty()) {
            return 0;
        }
        
        int successCount = 0;
        
        for (FixedDepositAccountData accountData : accounts) {
            try {
                if (accountData.getId() != null) {
                    UUID accountId = UUID.fromString(accountData.getId().toString());
                    accrueInterest(accountId, accrualDate);
                    successCount++;
                }
            } catch (Exception e) {
                LOG.error("Error accruing interest for account {}: {}", accountData.getAccountNo(), e.getMessage());
                // Continue with the next account even if there's an error
            }
        }
        
        return successCount;
    }

    @Override
    @Transactional
    public Money calculateMaturityAmount(FixedDepositAccount account, LocalDate maturityDate) {
        if (account == null) {
            return Money.zero(null);
        }
        
        if (maturityDate == null) {
            maturityDate = account.calculateMaturityDate();
        }
        
        final MathContext mc = MathContext.DECIMAL64;
        
        return this.fixedDepositInterestCalculator.calculateMaturityAmount(account, mc, false);
    }

    @Override
    @Transactional
    public int processMaturedAccounts(LocalDate maturityDate) {
        Collection<FixedDepositAccountData> accountsToProcess = getAccountsDueForMaturityProcessing(maturityDate);
        
        if (accountsToProcess == null || accountsToProcess.isEmpty()) {
            return 0;
        }
        
        int processedCount = 0;
        
        for (FixedDepositAccountData accountData : accountsToProcess) {
            try {
                if (accountData.getId() != null) {
                    final FixedDepositAccount account = this.fixedDepositAccountRepository.findById(accountData.getId().toString())
                            .orElseThrow(() -> new FixedDepositAccountNotFoundException(accountData.getId()));
                    
                    // Only process active accounts that are not already matured
                    if (account.isActive() && !account.isMatured()) {
                        // Update account status to matured
                        account.updateMaturityStatus();
                        
                        // Post final interest if needed
                        postInterest(UUID.fromString(account.getId().toString()), maturityDate);
                        
                        // Save the updated account
                        this.fixedDepositAccountRepository.save(account);
                        
                        // Trigger business event
                        this.businessEventNotifierService.notifyPostBusinessEvent(new FixedDepositMaturityBusinessEvent(account));
                        
                        // Notify account owner of maturity
                        this.savingsNotificationService.notifyAccountOwnerOfMaturity(account, SavingsNotificationEvent.DEPOSIT_MATURED);
                        
                        // Process account according to maturity instructions
                        processMaturityActions(account);
                        
                        processedCount++;
                    }
                }
            } catch (Exception e) {
                LOG.error("Error processing maturity for account {}: {}", accountData.getAccountNo(), e.getMessage());
                // Continue with the next account even if there's an error
            }
        }
        
        return processedCount;
    }

    @Override
    public boolean isInterestPostingDue(UUID accountId, LocalDate asOfDate) {
        try {
            final FixedDepositAccount account = this.fixedDepositAccountRepository.findById(accountId.toString())
                    .orElseThrow(() -> new FixedDepositAccountNotFoundException(accountId));
            
            // Fixed deposits typically don't have regular interest posting periods during the term
            // Interest is usually posted at maturity
            // But if the account has a specific posting schedule, we can check it
            
            // For now, let's check if the account has reached maturity
            final LocalDate maturityDate = account.calculateMaturityDate();
            if (maturityDate != null && !asOfDate.isBefore(maturityDate)) {
                // If the account has reached maturity and interest hasn't been posted yet
                return true;
            }
            
            return false;
            
        } catch (final Exception e) {
            LOG.error("Error checking if interest posting is due for account: {}", accountId, e);
            return false;
        }
    }

    @Override
    public LocalDate getNextInterestPostingDate(UUID accountId) {
        try {
            final FixedDepositAccount account = this.fixedDepositAccountRepository.findById(accountId.toString())
                    .orElseThrow(() -> new FixedDepositAccountNotFoundException(accountId));
            
            // For fixed deposits, the next interest posting date is typically the maturity date
            return account.calculateMaturityDate();
            
        } catch (final Exception e) {
            LOG.error("Error getting next interest posting date for account: {}", accountId, e);
            return null;
        }
    }

    @Override
    public Collection<FixedDepositAccountData> getAccountsDueForInterestPosting(LocalDate postingDate) {
        // Fixed deposits typically have interest posted at maturity
        // For the purposes of this method, we'll return accounts that have matured
        return getAccountsDueForMaturityProcessing(postingDate);
    }

    @Override
    public Collection<FixedDepositAccountData> getAccountsDueForMaturityProcessing(LocalDate maturityDate) {
        Collection<FixedDepositAccountData> result = new ArrayList<>();
        
        try {
            // Query for active accounts that mature on or before the given date
            // and haven't been set to matured status yet
            result = this.fixedDepositAccountReadPlatformService.retrieveMaturedDepositAccounts(maturityDate);
            
            return result;
            
        } catch (Exception e) {
            LOG.error("Error fetching fixed deposit accounts due for maturity processing", e);
            return result;
        }
    }
    
    // Helper methods
    
    private LocalDate calculateInterestPostingUpToDate(LocalDate postingDate, FixedDepositAccount account) {
        LocalDate interestPostingUpToDate = postingDate;
        
        // If posting date is after maturity, cap at maturity date
        LocalDate maturityDate = account.calculateMaturityDate();
        if (maturityDate != null && DateUtils.isAfter(postingDate, maturityDate)) {
            interestPostingUpToDate = maturityDate;
        }
        
        return interestPostingUpToDate;
    }
    
    private void handleInterestTransfer(FixedDepositAccount account, SavingsAccountTransaction interestPostingTransaction) {
        if (interestPostingTransaction == null || interestPostingTransaction.getAmount().compareTo(0.0) <= 0) {
            return;
        }
        
        Long toSavingsAccountId = account.getTransferToSavingsAccountId();
        if (toSavingsAccountId == null) {
            return;
        }
        
        try {
            final AccountTransferDTO accountTransferDTO = new AccountTransferDTO(
                    interestPostingTransaction.getTransactionLocalDate(), interestPostingTransaction.getAmount(), 
                    PortfolioAccountType.SAVINGS, PortfolioAccountType.SAVINGS,
                    account.getId(), toSavingsAccountId, "Interest Transfer", null, null, null, null, null,
                    null, null);
            
            this.accountTransfersWritePlatformService.transferFunds(accountTransferDTO);
            
        } catch (Exception e) {
            LOG.error("Error transferring interest from fixed deposit account {} to savings account {}",
                    account.getId(), toSavingsAccountId, e);
        }
    }
    
    private void processMaturityActions(FixedDepositAccount account) {
        if (account == null || !account.isMatured()) {
            return;
        }
        
        try {
            Integer onMaturityAction = account.getOnAccountClosureId();
            if (onMaturityAction == null) {
                return;
            }
            
            final DepositAccountOnClosureType closureType = DepositAccountOnClosureType.fromInt(onMaturityAction);
            
            switch (closureType) {
                case TRANSFER_TO_SAVINGS:
                    transferToSavingsOnMaturity(account);
                    break;
                case REINVEST:
                    reinvestOnMaturity(account);
                    break;
                case TRANSFER_TO_LINKED_ACCOUNT:
                    transferToLinkedAccountOnMaturity(account);
                    break;
                case WITHDRAW_DEPOSIT:
                    // The money stays in the account for manual withdrawal
                    break;
                default:
                    // Do nothing
                    break;
            }
            
        } catch (Exception e) {
            LOG.error("Error processing maturity action for account {}", account.getId(), e);
        }
    }
    
    private void transferToSavingsOnMaturity(FixedDepositAccount account) {
        Long toSavingsAccountId = account.getTransferToSavingsAccountId();
        if (toSavingsAccountId == null) {
            return;
        }
        
        try {
            // Transfer the full maturity amount
            final AccountTransferDTO accountTransferDTO = new AccountTransferDTO(
                    account.calculateMaturityDate(), account.getAccountBalance(), 
                    PortfolioAccountType.SAVINGS, PortfolioAccountType.SAVINGS,
                    account.getId(), toSavingsAccountId, "Maturity Amount Transfer", null, null, null, null, null,
                    null, null);
            
            this.accountTransfersWritePlatformService.transferFunds(accountTransferDTO);
            
            // Update account status to closed
            account.updateClosedStatus();
            this.fixedDepositAccountRepository.save(account);
            
        } catch (Exception e) {
            LOG.error("Error transferring maturity amount from fixed deposit account {} to savings account {}",
                    account.getId(), toSavingsAccountId, e);
        }
    }
    
    private void reinvestOnMaturity(FixedDepositAccount account) {
        try {
            // Create a new fixed deposit account with the maturity amount
            FixedDepositAccount newAccount = account.reInvest(account.getAccountBalance());
            
            // Save the new account
            this.fixedDepositAccountRepository.save(newAccount);
            
            // Update original account status to closed
            account.updateClosedStatus();
            this.fixedDepositAccountRepository.save(account);
            
        } catch (Exception e) {
            LOG.error("Error reinvesting fixed deposit account {}", account.getId(), e);
        }
    }
    
    private void transferToLinkedAccountOnMaturity(FixedDepositAccount account) {
        Long linkedAccountId = account.getLinkedAccountId();
        if (linkedAccountId == null) {
            return;
        }
        
        try {
            // Transfer the full maturity amount
            final AccountTransferDTO accountTransferDTO = new AccountTransferDTO(
                    account.calculateMaturityDate(), account.getAccountBalance(), 
                    PortfolioAccountType.SAVINGS, PortfolioAccountType.SAVINGS,
                    account.getId(), linkedAccountId, "Maturity Amount Transfer to Linked Account", null, null, null, null, null,
                    null, null);
            
            this.accountTransfersWritePlatformService.transferFunds(accountTransferDTO);
            
            // Update account status to closed
            account.updateClosedStatus();
            this.fixedDepositAccountRepository.save(account);
            
        } catch (Exception e) {
            LOG.error("Error transferring maturity amount from fixed deposit account {} to linked account {}",
                    account.getId(), linkedAccountId, e);
        }
    }
    
    private LocalDate getLastAccrualDate(FixedDepositAccount account) {
        // Find the last accrual transaction
        List<SavingsAccountTransaction> allTransactions = account.getTransactions();
        
        return allTransactions.stream()
                .filter(t -> t.isAccrualInterestPosting() && !t.isReversed())
                .sorted(Comparator.comparing(SavingsAccountTransaction::getTransactionLocalDate).reversed())
                .map(SavingsAccountTransaction::getTransactionLocalDate)
                .findFirst()
                .orElse(null);
    }
}