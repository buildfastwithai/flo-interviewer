export const maxDuration = 299;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Check if file is provided (required)
    const file = formData.get("file");
    if (!file) {
      return Response.json(
        { detail: "Transcript file is required" },
        { status: 400 }
      );
    }

    // Get optional fields with default values
    const skills_to_assess = formData.get("skills_to_assess") || 
      "Communication, Technical Knowledge, Problem Solving, Collaboration, Leadership";
    
    const job_role = formData.get("job_role") || "Software Engineer";
    const company_name = formData.get("company_name") || "Company";
    const ai_provider = formData.get("ai_provider") || "openai";

    // Create a new FormData to forward to the backend
    const backendFormData = new FormData();
    
    // If file is a Blob or File, read it and convert to string for inspection
    if (file instanceof Blob) {
      const fileContent = await file.text();
      console.log(`File content length: ${fileContent.length} characters`);
      console.log(`File content preview: ${fileContent.substring(0, 200)}...`);
      
      // Make sure it's properly formatted for analysis
      backendFormData.append("file", file);
    } else {
      console.log("File is not a Blob, using as is");
      backendFormData.append("file", file);
    }
    
    backendFormData.append("skills_to_assess", skills_to_assess.toString());
    backendFormData.append("job_role", job_role.toString());
    backendFormData.append("company_name", company_name.toString());
    backendFormData.append("ai_provider", ai_provider.toString());

    // Get the backend URL from environment variables
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // Always use the transcript analysis endpoint
    const endpoint = `${backendUrl}/analyze-transcript`;
    console.log("Sending analysis request to:", endpoint);

    // Forward the request to FastAPI backend
    const response = await fetch(endpoint, {
      method: "POST",
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Analysis failed with error:", errorData);
      return Response.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("API route error:", error);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}