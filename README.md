# Smart AI Opportunity Risk Assessment Wizard for B2B Sales

**Author:** Rajeev Shekhar – rshekhar@salesforce.com

This is a Salesforce DX project that deploys an AI-powered **Opportunity Risk Assessment Wizard**, designed to simplify and enhance the opportunity creation process in Salesforce.

## Prerequisites

Make sure you have the following tools installed and the required features enabled before starting:

### Required Tools

* **Salesforce CLI** (sf CLI) – Latest version
* **Node.js** – Version 18 or higher
* **Git** – For version control

### Org Feature Enablement

Enable the following features in your target Salesforce org:

* Einstein Generative AI
* Einstein for Sales
* Prompt Builder
* Data Cloud

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

**Note:** Replace `targetOrg` with your preferred alias for the target org.

### Step 3: Deploy to Salesforce

```bash
sf project deploy start -x manifest/package.xml -o targetOrg -l NoTestRun
```

This command deploys the metadata into your target org.

### Step 4: Configure Custom Action and Page Layout

* After deployment and LWC creation, create a **Custom Action** on the **Account** object, then drag and drop this Custom Action onto the relevant **Account Page Layout**.
* Set **Field Level Security (FLS)** for these fields:
  * `AI_Assistant_JSON__c`
  * `AI_Risk_Assessment_JSON__c`
  * `Legal_Check_Required__c`
* Update these field values manually if needed. Although the results of the risk analysis are normally stored in the above fields as JSON, you can manually populate them for demo readiness.
* Update the **API_Key** from **Perplexity** in the `PerplexityRiskAssessment` Apex class. (Optional for demos: some ready-made results are hardcoded, as described in the custom fields above.)

## Example Field Data

### Account.AI_Assistant_JSON__c

{
  "recommendations": {
    "autoFill": {
      "stageName": "Qualification",
      "amount": 75000,
      "closeDate": "2025-10-18",
      "probability": 75,
      "description": "DNV testing and inspection services including material testing, quality assurance, and certification support",
      "confidence": 0.88
    },
    "similarDeals": {
      "count": 12,
      "averageAmount": 82500,
      "averageTimelineMonths": 3.2,
      "successRate": 0.84,
      "stageName": "Needs Analysis",
      "amount": 85200,
      "closeDate": "2025-11-05",
      "probability": 78,
      "comparableOpportunities": [
        {
          "id": "0063000000GHI789",
          "name": "Alpine Manufacturing - Material Testing",
          "amount": 78000,
          "stageName": "Closed Won",
          "similarity": 0.91,
          "timelineMonths": 3.5
        },
        {
          "id": "0063000000JKL456",
          "name": "Nordic Components - Quality Certification",
          "amount": 89000,
          "stageName": "Closed Won",
          "similarity": 0.87,
          "timelineMonths": 2.8
        },
        {
          "id": "0063000000MNO123",
          "name": "German Precision - Testing Services",
          "amount": 71500,
          "stageName": "Closed Won",
          "similarity": 0.83,
          "timelineMonths": 4.1
        }
      ]
    },
    "timelineEstimation": {
      "estimatedMonths": 3.5,
      "phases": [
        {
          "name": "Testing Protocol Development",
          "durationWeeks": 2,
          "milestones": ["Test plan creation", "Standards identification"]
        },
        {
          "name": "Sample Collection & Preparation",
          "durationWeeks": 3,
          "milestones": ["Sample procurement", "Testing setup preparation"]
        },
        {
          "name": "Testing Execution & Analysis",
          "durationWeeks": 8,
          "milestones": ["Material testing", "Data analysis", "Quality verification"]
        },
        {
          "name": "Reporting & Certification",
          "durationWeeks": 2,
          "milestones": ["Final reporting", "Certificate preparation"]
        }
      ],
      "recommendedCloseDate": "2025-10-28",
      "riskFactors": [
        "Sample availability and delivery schedules",
        "Testing equipment calibration requirements",
        "Third-party laboratory coordination if needed"
      ]
    },
    "riskAdjustedPricing": {
      "baseAmount": 75000,
      "adjustmentFactors": [
        {
          "factor": "Standard compliance requirements",
          "multiplier": 1.02,
          "reason": "Routine documentation and certification processes"
        },
        {
          "factor": "Manufacturing sector experience",
          "multiplier": 0.98,
          "reason": "Established DNV expertise in manufacturing testing"
        }
      ],
      "adjustedAmount": 76500,
      "confidence": 0.92
    },
    "proposalGeneration": {
      "templateAvailable": true,
      "templateId": "DNV_TESTING_TEMPLATE_V3.2",
      "customizationData": {
        "serviceSpecialization": "Testing & Inspection",
        "riskProfile": "Low risk with standard compliance",
        "regulatoryFocus": ["ISO Standards", "CE Marking", "Material Standards"],
        "keyDifferentiators": [
          "Global network of accredited testing laboratories",
          "Advanced material testing capabilities",
          "Digital testing and reporting solutions",
          "Industry-leading turnaround times"
        ],
        "estimatedDeliverables": [
          "Comprehensive testing reports",
          "Material certification documents",
          "Quality compliance verification",
          "Digital test data repository"
        ]
      }
    },
    "checkSimilar": {
      "totalFound": 18,
      "mostRelevant": 12,
      "insights": [
        "Manufacturing testing projects typically close 20% faster in Q3/Q4",
        "Standard testing services show 95% win rate with proper scoping",
        "German market shows strong preference for accredited testing labs"
      ],
      "stageName": "Proposal/Price Quote",
      "amount": 79500,
      "closeDate": "2025-10-15",
      "probability": 82
    }
  },
  "industryInsights": {
    "marketTrends": [
      "Increased demand for advanced material testing in manufacturing",
      "Digital transformation in testing and quality assurance",
      "Sustainability and eco-friendly material testing requirements"
    ],
    "pricingBenchmarks": {
      "regionMultiplier": 1.08,
      "serviceTypeMultiplier": 0.95,
      "industryMultiplier": 1.02,
      "marketRange": {
        "low": 45000,
        "high": 150000,
        "median": 78000,
        "recommended": 82000
      }
    },
    "competitiveFactors": [
      "DNV global reputation in testing and certification",
      "Comprehensive testing laboratory network",
      "Strong presence in German manufacturing sector"
    ]
  }
}