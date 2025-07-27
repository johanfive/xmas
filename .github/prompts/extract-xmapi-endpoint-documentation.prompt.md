---
mode: 'agent'
model: Gemini 2.5 Pro Preview (Gemini)
tools: ['codebase', 'editFiles', 'fetch']
description: 'Extract and format documentation for a specific xmAPI endpoint from the xMatters API documentation website.'
---

# Extract xmAPI Endpoint Documentation

You are tasked with extracting and formatting documentation for a specific xmAPI endpoint from the official xMatters API documentation website.

## Input

You will be provided with:
1. A URL to a specific section of the xMatters API documentation (e.g., `https://help.xmatters.com/xmapi/#services`)
2. The endpoint name (e.g., "services", "people", "groups", etc.)

## Output Format

Generate a markdown file that follows this exact structure and formatting:

### Header Block
```markdown
> This file's content is copy-pasted straight from the
> [online doc here](ACTUAL_URL_PROVIDED), mistakes, typos and all. This is
> meant to be used as a starting point to build the endpoint, and then as a reference to generate
> validation scenarios in the sandbox. Once the documentation is confirmed accurate or proving to be
> inaccurate, the relevant code implementation is rectified to match the reality of the API, but
> this markdown file here will be left untouched.
```

### Main Content Structure

1. **Endpoint Title**: Use the exact title from the documentation (e.g., `# SERVICES`)

2. **Introduction**: Copy the introductory paragraph(s) that describe what the endpoint does

3. **API Operations**: For each operation (GET, POST, DELETE, etc.), include:
   - **Operation heading** (e.g., `## Get services`)
   - **Complete description** of what the operation does, including:
     - Main description paragraph
     - ALL additional explanatory paragraphs that follow
   - **HTTP method and path examples** in code blocks
   - **Query Parameters** section (if applicable) with:
     - Parameter name and type
     - Detailed description
     - Valid values or constraints
   - **URL Parameters** section (if applicable)
   - **Body Parameters** section (if applicable)
   - **Example** section with:
     - Request example (curl command)
     - Response example (JSON)

4. **Object Definition**: Include the object schema section at the end (e.g., `## Service object`)
   - List all properties with types
   - Provide descriptions for each property
   - Include a complete example JSON object

## Requirements

- **Preserve all original text exactly**: Copy all content verbatim, including any typos, formatting inconsistencies, or errors from the source
- **Include complete descriptions**: For each API operation, copy the main description AND all additional explanatory paragraphs that follow
- **Maintain formatting**: Keep the same markdown structure, code block formatting, and indentation
- **Include all examples**: Copy all curl commands and JSON responses exactly as shown
- **Preserve parameter details**: Include all parameter descriptions, valid values, and constraints
- **Keep structure consistent**: Follow the same heading hierarchy and section organization as shown in the reference

## Quality Checklist

Before submitting, ensure:
- [ ] The header block is present with the correct URL
- [ ] All HTTP operations are documented with complete descriptions (including all explanatory paragraphs)
- [ ] Parameter tables are complete with types and descriptions
- [ ] JSON examples are properly formatted in code blocks
- [ ] The object definition section is included at the end
- [ ] All original formatting and content is preserved exactly
- [ ] No descriptive text has been truncated or omitted

## Example Reference

Use the structure and formatting shown in the services endpoint documentation as your template for consistency across all endpoint documentation files.
