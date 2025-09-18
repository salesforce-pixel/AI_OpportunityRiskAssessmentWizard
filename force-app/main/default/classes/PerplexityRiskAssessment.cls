public with sharing class PerplexityRiskAssessment {

    // 🔐 Store this securely via Custom Metadata in production
    private static final String API_KEY = 'write_your_API_key_here_OR_use_Custom_Metadata';

    @InvocableMethod(label='Get Risk Assessment from Perplexity' description='Generates a risk assessment report.')
    public static List<Response> performRiskAssessment(List<Request> requests) {
        List<Response> responses = new List<Response>();
        String companyName = requests[0].companyName;

        // Build the risk assessment prompt
        String prompt = 'Act as a Risk & Regulatory Intelligence Analyst. Your task is to perform a comprehensive external risk assessment on the company: ' 
            + companyName + ' based on publicly available web data. Your output must strictly follow the JSON schema provided below. '
            + 'You must research across multiple sources such as news, official regulatory databases, sanctions lists, ESG reports, and industry standards. '
            + 'For each section of the assessment, look for the latest and most authoritative information.\n'
            + 'Use the following topics as the core of your investigation (mapped to the title attributes of the JSON):\n'
            + 'Sanctions Screening – search for global sanctions, PEP involvement, or supplier/entity links using terms like: "' + companyName + ' sanctions", "OFAC", "EU sanctions", "UN Consolidated", etc."\n'
            + 'Country Risk Analysis – investigate political, economic, regulatory, and infrastructural risks related to the country in which the company operates or is registered.\n'
            + 'Industry Compliance – search for sectoral standards, required certifications, mandatory regulations, and typical compliance issues in the company’s industry.\n'
            + 'Environmental Compliance – check for ESG ratings, carbon emission data, sustainability practices, environmental violations, or regulatory pressure the company might face.';

        // Construct JSON payload
        Map<String, Object> messagePayload = new Map<String, Object>{
            'model' => 'sonar-pro',
            'messages' => new List<Map<String, Object>> {
                new Map<String, Object>{
                    'role' => 'user',
                    'content' => prompt
                }
            }
        };

        Response output = new Response();

        try {
            String requestBody = JSON.serialize(messagePayload);

            HttpRequest req = new HttpRequest();
            req.setEndpoint('https://api.perplexity.ai/chat/completions');
            req.setMethod('POST');
            req.setHeader('Content-Type', 'application/json');
            req.setHeader('Authorization', 'Bearer ' + API_KEY);
            req.setTimeout(120000);
            req.setBody(requestBody);

            Http http = new Http();
            HttpResponse res = http.send(req);

            if (res != null && res.getStatusCode() == 200 && String.isNotBlank(res.getBody())) {
                output.Prompt = res.getBody();
            } else {
                output.Prompt = 'API call failed. Status code: ' + (res != null ? String.valueOf(res.getStatusCode()) : 'null');
            }
        } catch (Exception ex) {
            output.Prompt = 'Exception during API call: ' + ex.getMessage();
        }

        responses.add(output);
        return responses;
    }

    public class Request {
        @InvocableVariable(label='Company Name' required=true)
        public String companyName;
    }

    public class Response {
        @InvocableVariable(label='Response Text')
        public String Prompt;
    }
}