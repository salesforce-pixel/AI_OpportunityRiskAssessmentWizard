# Smart AI Opportunity Risk Assessment Wizard for B2B Sales

**Author:** Rajeev Shekhar - rshekhar@salesforce.com

An intelligent Salesforce DX project that deploys an AI-powered Opportunity Risk Assessment Wizard, designed to easily create the Opportunity creation process in Salesforce.

## Prerequisites

Ensure you have the following tools installed before starting:

- **[Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli)** (sf CLI) - Latest version
- **[Node.js](https://nodejs.org/)** - Version 18 or higher
- **[Git](https://git-scm.com/)** - For version control
- **Enable Prerequisites:** Ensure the following features are enabled in your target org:
   - Einstein Generative AI
   - Einstein for Sales
   - Prompt Builder
   - Data Cloud

## Quick Start Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/salesforce-pixel/AI_OpportunityRiskAssessmentWizard.git
cd <repository-name>
```

### Step 2: Authenticate with Your Salesforce Org

```bash
sf org login web -a targetOrg
```

> **Note:** Replace `targetOrg` with your preferred alias for the target organization.

### Step 3: Deploy to Salesforce

```bash
sf project deploy start -x manifest/package.xml -o targetOrg -l NoTestRun
```

The metadata will be deployed to your target org automatically.

### Step 4: Load Sample Data

Import the sample Sales Alert data to activate the dashboard:

```bash
sf data import tree --files Sales_Alerts__c.json --target-org yourTargetOrg 
```