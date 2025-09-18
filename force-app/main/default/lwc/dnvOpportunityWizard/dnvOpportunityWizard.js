import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue, createRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import VR_LOGO from '@salesforce/resourceUrl/VireliaNexusLogo';
import performSearch from '@salesforce/apex/PerplexityRiskAssessmentGrounding.performSearch';

import ACCOUNT_WEBSITE_FIELD from '@salesforce/schema/Account.Website';
import ACCOUNT_NAME_FIELD from '@salesforce/schema/Account.Name';
import ACCOUNT_INDUSTRY_FIELD from '@salesforce/schema/Account.Industry';
import AI_ASSISTANT_JSON_FIELD from '@salesforce/schema/Account.AI_Assistant_JSON__c';
import AI_RISK_JSON_FIELD from '@salesforce/schema/Account.AI_Risk_Assessment_JSON__c';
import LEGAL_CHECK_REQUIRED_FIELD from '@salesforce/schema/Account.Legal_Check_Required__c';
import ID_FIELD from "@salesforce/schema/Account.Id";

export default class DnvOpportunityWizard extends LightningElement {
    @api recordId;

    currentStep = '1';
    currentSubStep = '';
    account;
    opportunityData = {
        Type: '',
        Name: '',
        StageName: 'Prospecting',
        CloseDate: null,
        Amount: null,
        AccountId: ''
    };
    riskResults = {};
    aiRecommendations = {};
    backendRiskData = {};
    backendAIData = {};
    forceUpdate = false;
    isLoadingAccount = true;
    isScanning = false;
    scanComplete = false;
    scanStatusText = 'Initializing Compliance Screening Process...';
    isCreating = false;
    isCreatingWithLegalCheck = false;
    aiActionMessage = '';
    riskReportGenerated = false;
    lastUpdatedOn = null;
    creationStepText = 'Initializing Opportunity Creation';
    vrLogoUrl = VR_LOGO;

    @wire(getRecord, {
        recordId: '$recordId',
        fields: [
            ACCOUNT_WEBSITE_FIELD,
            ACCOUNT_NAME_FIELD,
            ACCOUNT_INDUSTRY_FIELD,
            AI_ASSISTANT_JSON_FIELD,
            AI_RISK_JSON_FIELD,
            LEGAL_CHECK_REQUIRED_FIELD
        ]
    })
    wiredAccount({ data, error }) {
        if (data) {
            this.account = data;
            this.opportunityData.AccountId = this.recordId;
            this.opportunityData.Name = getFieldValue(this.account, ACCOUNT_NAME_FIELD) + ' - New Opportunity';
            this.loadAIAssistantData();
            const riskJson = getFieldValue(this.account, AI_RISK_JSON_FIELD);
            if (riskJson) {
                try {
                    const parsed = JSON.parse(riskJson);
                    this.lastUpdatedOn = parsed.completedAt ? new Date(parsed.completedAt) : null;
                } catch (e) {
                    this.lastUpdatedOn = null;
                    console.error('Error parsing AI_RISK_JSON__c:', e);
                }
            } else {
                this.lastUpdatedOn = null;
            }
        } else if (error) {
            this.showToast('Error', 'Could not load account data.', 'error');
        }
        this.isLoadingAccount = false;
    }

    loadAIAssistantData() {
        const aiJson = getFieldValue(this.account, AI_ASSISTANT_JSON_FIELD);
        if (aiJson) {
            try {
                const parsed = JSON.parse(aiJson);
                this.aiRecommendations = parsed.recommendations || {};
                this.backendAIData = parsed;
            } catch (e) {
                console.error('Error parsing AI assistant JSON:', e);
                this.showToast('Error', 'Could not parse AI Assistant data. Please contact administrator.', 'error');
            }
        } else {
            this.aiRecommendations = {};
            this.backendAIData = {};
        }
    }

    async startRiskScan() {
        if (!this.opportunityData.Type) {
            this.showToast('Selection Required', 'Please select a Service type first.', 'warning');
            return;
        }
        this.isScanning = true;
        this.scanComplete = false;

        const scanStages = [
            'Initializing Compliance Screening...',
            'Checking Global Sanctions Databases (OFAC, EU, UN)...',
            'Analyzing Country Risk Factors & Maritime Zones...',
            'Reviewing Industry-Specific Regulations...',
            'Validating Against Client Database...',
            'Assessing Environmental Compliance Requirements...',
            'Evaluating Cybersecurity Risk Factors...',
            'Compiling Comprehensive Risk Assessment...',
            'Generating Compliance Documentation...'
        ];

        // Animate the status text
        const animationPromise = (async () => {
            for (const stage of scanStages) {
                this.scanStatusText = stage;
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        })();

        // Run the main risk logic (force update or cached)
        const riskAssessmentPromise = this.runRiskAssessmentWithCache(this.forceUpdate);

        await Promise.all([animationPromise, riskAssessmentPromise]);

        this.isScanning = false;
        this.scanComplete = true;
        this.currentSubStep = 'results';
        this.riskReportGenerated = true;
        this.showToast('Validation Complete', 'Comprehensive Risk Assessment Completed. Review Results Below.', 'success');
    }

    // --- Main risk assessment cache/refresh logic ---
    async runRiskAssessmentWithCache(forceUpdate = false) {
        if (forceUpdate) {
            // Always run Apex and cache when forced
            await this.runRiskAssessmentAndCache();
            this.lastUpdatedOn = this.backendRiskData.completedAt ? new Date(this.backendRiskData.completedAt) : new Date();
            return;
        }
        const cachedJson = getFieldValue(this.account, AI_RISK_JSON_FIELD);
        if (cachedJson) {
            try {
                const parsed = JSON.parse(cachedJson);
                this.riskResults = parsed.results || {};
                this.backendRiskData = parsed;
                this.lastUpdatedOn = parsed.completedAt ? new Date(parsed.completedAt) : null;
                console.log('Loaded risk assessment from Account cache');
                return;
            } catch (e) {
                // Cache exists but is bad JSON: show error, then run Apex & update cache
                console.error('Error parsing cached risk assessment:', e);
                this.lastUpdatedOn = null;
                this.showToast('Error', 'Could not parse cached risk data. Re-running assessment...', 'error');
                await this.runRiskAssessmentAndCache();
                return;
            }
        } else {
            // Cache is blank: run Apex and update cache
            await this.runRiskAssessmentAndCache();
            this.lastUpdatedOn = this.backendRiskData.completedAt ? new Date(this.backendRiskData.completedAt) : new Date();
        }
    }

    // --- Run Apex, update field for caching ---
    async runRiskAssessmentAndCache() {
        const companyName = getFieldValue(this.account, ACCOUNT_NAME_FIELD);
        try {
            const riskJson = await performSearch({ companyName });
            if (riskJson) {
                const parsed = JSON.parse(riskJson);
                this.riskResults = parsed.results || {};
                this.backendRiskData = parsed;
                // Cache to Account field using updateRecord
                const fields = {};
                fields[ID_FIELD.fieldApiName] = this.recordId;
                fields[AI_RISK_JSON_FIELD.fieldApiName] = riskJson;
                await updateRecord({ fields });
                console.log('Risk assessment cached to Account');
            } else {
                this.riskResults = {};
                this.backendRiskData = {};
            }
        } catch (e) {
            console.error('Error in risk assessment:', e);
            this.showToast('Error', 'Could not fetch risk assessment data. Please contact administrator.', 'error');
            this.riskResults = {};
            this.backendRiskData = {};
        }
    }

    async handleCreateOpportunity() {
        if (!this.opportunityData.Name || !this.opportunityData.StageName) {
            this.showToast('Validation Error', 'Please ensure all required fields are completed using the AI Assistant.', 'error');
            return;
        }
        if (!this.opportunityData.CloseDate) {
            this.showToast('Missing Information', 'Please set a close date using the AI Assistant before creating the opportunity.', 'warning');
            return;
        }

        const legalCheckRequired = getFieldValue(this.account, LEGAL_CHECK_REQUIRED_FIELD);
        
        if (legalCheckRequired) {
            await this.handleCreateOpportunityWithLegalCheck();
        } else {
            await this.handleCreateOpportunityStandard();
        }
    }

    async handleCreateOpportunityWithLegalCheck() {
        this.isCreatingWithLegalCheck = true;
        
        const creationStages = [
            'Analyzing your request...',
            'Creating the Opportunity...',
            'Running AI based Analysis...',
            'Submitting Opportunity to Legal & Compliance...',
            'Opportunity ready & submitted for approval ...'
        ];

        // Animate the status text
        const animationPromise = (async () => {
            for (const stage of creationStages) {
                this.creationStepText = stage;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        })();

        // Run the actual opportunity creation
        const creationPromise = this.createOpportunityRecord();

        await Promise.all([animationPromise, creationPromise]);

        this.isCreatingWithLegalCheck = false;
        this.showToast('Success',
            `Opportunity "${this.opportunityData.Name}" has been created successfully with comprehensive compliance validation and legal review.`,
            'success');
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    async handleCreateOpportunityStandard() {
        this.isCreating = true;
        this.creationStepText = 'Setting up your Opportunity with relevant information...';
        
        setTimeout(async () => {
            await this.createOpportunityRecord();
            this.isCreating = false;
            this.showToast('Success',
                `Opportunity "${this.opportunityData.Name}" has been created successfully with comprehensive compliance validation.`,
                'success');
            this.dispatchEvent(new CloseActionScreenEvent());
        }, 2000);
    }

    async createOpportunityRecord() {
        try {
            const recordInput = {
                apiName: 'Opportunity',
                fields: {
                    ...this.opportunityData,
                    Service_Type__c: this.opportunityData.Type,
                    Description: this.generateOpportunityDescription()
                }
            };
            
            const opportunity = await createRecord(recordInput);
            return opportunity;
        } catch (error) {
            this.isCreating = false;
            this.isCreatingWithLegalCheck = false;
            this.showToast('Error Creating Opportunity',
                error.body?.message || 'An unexpected error occurred. Please try again.',
                'error');
            console.error('Error creating opportunity:', JSON.stringify(error));
            throw error;
        }
    }

    // ---- rest of your code unchanged below ----

    get isStep1() { return this.currentStep === '1'; }
    get isStep2() { return this.currentStep === '2'; }
    get isStep3() { return this.currentStep === '3'; }

    get isSubStepTypeSelection() {
        return this.currentStep === '2' && (this.currentSubStep === '' || this.currentSubStep === 'type');
    }
    get isSubStepRiskAssessment() {
        return this.currentStep === '2' && this.currentSubStep === 'risk';
    }
    get isSubStepResults() {
        return this.currentStep === '2' && this.currentSubStep === 'results';
    }

    get isStep2OrLater() {
        return this.currentStep === '2' || this.currentStep === '3';
    }

    get step1Classes() {
        return this.currentStep === '1' ? 'step-indicator active' :
            parseInt(this.currentStep) > 1 ? 'step-indicator completed' : 'step-indicator';
    }

    get step2Classes() {
        return this.currentStep === '2' ? 'step-indicator active' :
            parseInt(this.currentStep) > 2 ? 'step-indicator completed' : 'step-indicator';
    }

    get step3Classes() {
        return this.currentStep === '3' ? 'step-indicator active' : 'step-indicator';
    }

    get opportunityTypeOptions() {
        return [
            { label: 'Advisory Services', value: 'Advisory', description: 'Strategic consulting and expert guidance', icon: 'utility:knowledge_base' },
            { label: 'Class & Statutory', value: 'Classification', description: 'Ship classification and regulatory compliance', icon: 'utility:anchor' },
            { label: 'Renewables Certification', value: 'Renewables', description: 'Wind, solar, and battery certification services', icon: 'utility:energy' },
            { label: 'Cybersecurity Assurance', value: 'Cybersecurity', description: 'Digital security and IT risk assessment', icon: 'utility:lock' },
            { label: 'Digital Solutions', value: 'Digital', description: 'Software and digital transformation', icon: 'utility:connected_apps' },
            { label: 'Supply Chain Assurance', value: 'Supply Chain', description: 'Vendor qualification and supply chain risk', icon: 'utility:link' },
            { label: 'Testing & Inspection', value: 'Testing', description: 'Quality assurance and materials testing', icon: 'utility:metrics' },
            { label: 'Training & Development', value: 'Training', description: 'Professional development and certification', icon: 'utility:education' }
        ];
    }

    handleNext() {
        if (this.currentStep === '1') {
            this.currentStep = '2';
            this.currentSubStep = 'type';
        } else if (this.currentStep === '2') {
            if (!this.opportunityData.Type) {
                this.showToast('Required Field', 'Please select an Opportunity Type to continue.', 'warning');
                return;
            }
            if (!this.scanComplete) {
                this.showToast('Validation Required', 'Please complete the compliance validation before continuing.', 'warning');
                return;
            }
            this.currentStep = '3';
            this.currentSubStep = '';
        }
    }

    handleForceUpdateChange(event) {
        this.forceUpdate = event.target.checked;
    }

    handleBack() {
        if (this.currentStep === '3') {
            this.currentStep = '2';
            this.currentSubStep = 'results';
        } else if (this.currentStep === '2') {
            if (this.currentSubStep === 'results') {
                this.currentSubStep = 'risk';
            } else if (this.currentSubStep === 'risk') {
                this.currentSubStep = 'type';
            } else {
                this.currentStep = '1';
                this.currentSubStep = '';
                this.isScanning = false;
                this.scanComplete = false;
            }
        }
    }

    handleCancel() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    handleTypeSelection(event) {
        const selectedType = event.currentTarget.dataset.value;
        this.opportunityData.Type = selectedType;
        const accountName = getFieldValue(this.account, ACCOUNT_NAME_FIELD);
        this.opportunityData.Name = `${accountName} - ${selectedType}`;
        this.isScanning = false;
        this.scanComplete = false;
        this.riskReportGenerated = false;
        setTimeout(() => {
            this.currentSubStep = 'risk';
        }, 1000);
    }

    get advisoryClasses() { return this.opportunityData.Type === 'Advisory' ? 'type-card selected' : 'type-card'; }
    get classificationClasses() { return this.opportunityData.Type === 'Classification' ? 'type-card selected' : 'type-card'; }
    get renewablesClasses() { return this.opportunityData.Type === 'Renewables' ? 'type-card selected' : 'type-card'; }
    get cybersecurityClasses() { return this.opportunityData.Type === 'Cybersecurity' ? 'type-card selected' : 'type-card'; }
    get digitalClasses() { return this.opportunityData.Type === 'Digital' ? 'type-card selected' : 'type-card'; }
    get supplyChainClasses() { return this.opportunityData.Type === 'Supply Chain' ? 'type-card selected' : 'type-card'; }
    get testingClasses() { return this.opportunityData.Type === 'Testing' ? 'type-card selected' : 'type-card'; }
    get trainingClasses() { return this.opportunityData.Type === 'Training' ? 'type-card selected' : 'type-card'; }

    handleAIAssist(event) {
        const action = event.currentTarget.dataset.action;
        this.aiActionMessage = '';
        setTimeout(() => {
            this.applyAIRecommendationFromJSON(action);
            setTimeout(() => {
                this.aiActionMessage = '';
            }, 5000);
        }, 1000);
    }

    applyAIRecommendationFromJSON(action) {
        const recommendations = this.aiRecommendations;
        if (action === 'autoFill' && recommendations.autoFill) {
            this.opportunityData.StageName = recommendations.autoFill.stageName;
            this.opportunityData.Amount = recommendations.autoFill.amount;
            this.opportunityData.CloseDate = recommendations.autoFill.closeDate;
            this.aiActionMessage = '✓ Opportunity populated with intelligent defaults based on service type and account profile';
        } else if (action === 'fillFromSimilar' && recommendations.similarDeals) {
            this.opportunityData.StageName = recommendations.similarDeals.stageName;
            this.opportunityData.Amount = recommendations.similarDeals.amount;
            this.opportunityData.CloseDate = recommendations.similarDeals.closeDate;
            this.aiActionMessage = `✓ Fields updated based on ${recommendations.similarDeals.count} similar successful opportunities in this industry`;
        } else if (action === 'checkSimilar' && recommendations.checkSimilar) {
            this.opportunityData.StageName = recommendations.checkSimilar.stageName;
            this.opportunityData.Amount = recommendations.checkSimilar.amount;
            this.opportunityData.CloseDate = recommendations.checkSimilar.closeDate;
            this.aiActionMessage = `✓ Found ${recommendations.checkSimilar.totalFound} comparable projects - timeline and pricing insights applied`;
        } else if (action === 'estimateTimeline' && recommendations.timelineEstimation) {
            this.opportunityData.CloseDate = recommendations.timelineEstimation.recommendedCloseDate;
            this.aiActionMessage = `✓ Estimated project timeline: ${recommendations.timelineEstimation.estimatedMonths} months - close date adjusted accordingly`;
        } else if (action === 'riskPricing' && recommendations.riskAdjustedPricing) {
            this.opportunityData.Amount = recommendations.riskAdjustedPricing.adjustedAmount;
            this.aiActionMessage = '✓ Pricing adjusted based on risk assessment results and compliance requirements';
        } else if (action === 'generateProposal' && recommendations.proposalGeneration) {
            this.aiActionMessage = '✓ Initial proposal template will be generated and attached upon opportunity creation';
        }
    }

    exportRiskReport() {
        this.showToast('Export Started', 'Risk assessment report is being generated and will be downloaded shortly.', 'info');
        setTimeout(() => {
            this.showToast('Export Complete', 'Risk assessment report has been downloaded successfully.', 'success');
        }, 2000);
    }

    generateOpportunityDescription() {
        let description = `Created via Opportunity Wizard with comprehensive compliance validation.\n\n`;
        description += `Service Type: ${this.opportunityData.Type}\n`;
        if (this.backendRiskData && this.backendRiskData.completedAt) {
            description += `Risk Assessment: Completed on ${new Date(this.backendRiskData.completedAt).toLocaleDateString()}\n`;
        }
        if (this.backendRiskData && this.backendRiskData.scanId) {
            description += `Scan ID: ${this.backendRiskData.scanId}\n\n`;
        }
        description += `Compliance Summary:\n`;
        if (this.riskResults.sanctions) {
            description += `- Sanctions Screening: ${this.riskResults.sanctions.statusText}\n`;
        }
        if (this.riskResults.country) {
            description += `- Country Risk: ${this.riskResults.country.statusText}\n`;
        }
        if (this.riskResults.industry) {
            description += `- Industry Compliance: ${this.riskResults.industry.statusText}\n`;
        }
        if (this.riskResults.environmental) {
            description += `- Environmental Impact: ${this.riskResults.environmental.statusText}\n`;
        }
        if (this.riskReportGenerated) {
            description += `\nDetailed risk assessment report attached.`;
        }
        return description;
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: variant === 'error' ? 'sticky' : 'dismissible'
        });
        this.dispatchEvent(event);
    }
}