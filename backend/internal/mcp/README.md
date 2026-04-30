# Manris MCP Server

Stdio-based Model Context Protocol server for Manris v2 risk management platform. Exposes 7 risk management tools to AI coding agents via OpenCode and Claude Code.

## Overview

The MCP server is a specialized stdio binary (`cmd/mcp/main.go`) that:
- Runs as a child process with stdio communication channel
- Exposes 7 risk management tools wired to existing backend usecases
- Maintains single-session state with JWT expiry enforcement
- Supports auth workflows, risk CRUD, and approval submission

**Note**: This is a Single-Client Stdio Server. Each AI agent instance (OpenCode, Claude Code) spawns its own isolated server process.

## Architecture

```
┌─────────────────────────────────────────┐
│  OpenCode / Claude Code (AI Agent)      │
│  ├─ stdin  (sends JSON-RPC requests)    │
│  └─ stdout (receives JSON-RPC responses)│
└──────────────┬──────────────────────────┘
               │
               │ JSON-RPC 2.0 over stdio
               │
┌──────────────▼──────────────────────────┐
│  manris-mcp binary                       │
│  ├─ Bootstrap (container init)           │
│  ├─ Session Manager (atomic storage)     │
│  └─ Tool Handlers (7 risk tools)         │
└──────────────┬──────────────────────────┘
               │
               │ Uses existing usecases
               │
┌──────────────▼──────────────────────────┐
│  Manris Backend                         │
│  ├─ Risk Management Usecases             │
│  ├─ Approval Workflow Usecases           │
│  └─ PostgreSQL Database                  │
└─────────────────────────────────────────┘
```

## Tools Catalog

### 1. `login`
Authenticate a user and establish a session for subsequent tool calls.

**Input**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Output** (on success):
```json
{
  "userId": "uuid",
  "username": "string",
  "name": "string",
  "role": "super_admin|unit|reviewer|pimpinan",
  "accessibleOrgIds": ["uuid", ...],
  "expiresAt": "2026-04-25T10:30:00Z"
}
```

**Security**: No JWT token is returned to the LLM. Only user metadata is exposed. Session is stored server-side in atomic storage.

---

### 2. `get_risk`
Retrieve a specific risk by ID.

**Input**:
```json
{
  "id": "uuid string"
}
```

**Output**:
```json
{
  "id": "uuid",
  "code": "R001",
  "title": "string",
  "description": "string",
  "category": "string",
  "status": "draft|assessment_draft|approved",
  "probability": 1-5,
  "impact": 1-5,
  "weight": "number",
  "organizationId": "uuid",
  ...
}
```

**Auth**: Requires active session. Filtered by `session.AccessibleOrgIDs`.

---

### 3. `list_risks`
List risks with optional filtering.

**Input**:
```json
{
  "status": "string (optional, e.g., 'approved')",
  "limit": "number (default: 100)",
  "offset": "number (default: 0)"
}
```

**Output**:
```json
{
  "risks": [
    {"id": "uuid", "code": "R001", "title": "...", ...},
    ...
  ],
  "total": "number"
}
```

**Auth**: Requires active session. Filtered by org scope.

---

### 4. `create_and_approve_risk`
Create a new risk and submit for approval in a single call.

**Input**:
```json
{
  "title": "string (required)",
  "category": "string (required)",
  "organizationId": "uuid (required)",
  "description": "string",
  "probability": 1-5 (required),
  "impact": 1-5 (required),
  "weight": "number",
  "riskApproverIds": ["uuid", ...],
  "submissionType": "approval|draft",
  "notes": "string (optional)"
}
```

**Output**:
```json
{
  "risk": {
    "id": "uuid",
    "code": "R001",
    "status": "approved|draft",
    ...
  },
  "approval": {
    "id": "uuid",
    "status": "approved|pending",
    "message": "string"
  }
}
```

**Behavior**:
- If `RISK_APPROVAL_WORKFLOW_ENABLED=false`: Risk is auto-approved with `status=approved`
- If `RISK_APPROVAL_WORKFLOW_ENABLED=true`: Risk created as draft, approval submitted to queue
- Working paper lock check honored (returns error if locked)

**Auth**: Requires active session. Risk assigned to org from session scope.

---

### 5. `update_risk_draft`
Update a draft risk.

**Input**:
```json
{
  "id": "uuid (required)",
  "title": "string",
  "category": "string",
  "description": "string",
  "probability": 1-5,
  "impact": 1-5,
  "weight": "number"
}
```

**Output**:
```json
{
  "id": "uuid",
  "code": "R001",
  "status": "draft",
  "message": "updated successfully"
}
```

**Constraints**:
- Risk must be in `draft` status. Returns error if already approved/submitted.
- Working paper lock check honored.
- User must have access to risk's organization.

---

### 6. `monitor_and_approve_risk`

> Legacy tool name. Current behavior only creates reassessment draft and returns draft status/message. It does not submit approval.
Create a risk reassessment and submit for approval.

**Input**:
```json
{
  "riskId": "uuid (required)",
  "assessmentCycle": "string (e.g., '2026-H1', required)",
  "riskApproverIds": ["uuid", ...],
  "submissionType": "approval|draft",
  "notes": "string (optional)"
}
```

**Output**:
```json
{
  "id": "uuid",
  "status": "approved|pending",
  "message": "string",
  "cycle": "2026-H1"
}
```

**Behavior**:
- Creates reassessment draft for monitoring cycle
- Submits to approval queue if `submissionType=approval`
- Auto-approves if `RISK_APPROVAL_WORKFLOW_ENABLED=false`

---

### 7. `update_monitoring_draft`
Update a risk reassessment draft.

**Input**:
```json
{
  "id": "uuid (required)",
  "reviewSummary": "string",
  "assessmentCycle": "string"
}
```

**Output**:
```json
{
  "id": "uuid",
  "code": "R001",
  "message": "updated successfully"
}
```

---

## Setup & Configuration

### Environment Variables

Create `.env` in the `backend/` directory:

```bash
# Server
PORT=8080

# Database
DATABASE_URL=postgres://user:password@localhost:5432/manris?sslmode=disable

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY_HOURS=24

# CORS (for HTTP server, not MCP)
CORS_ORIGINS=http://localhost:3000

# OpenAI
OPENAI_API_KEY=your-key-here

# Risk workflow
RISK_APPROVAL_WORKFLOW_ENABLED=true
```

### Building the MCP Server

```bash
cd backend

make mcp-build
```

Output: `./bin/mcp` binary

### Running the MCP Server (Standalone)

```bash
./bin/mcp
```

The server will start reading JSON-RPC requests from stdin.

---

## Integration with OpenCode / Claude Code

### Configuration (OpenCode)

In your project, create or update `.agents/mcp/manris.json`:

```json
{
  "name": "manris-mcp",
  "description": "Manris v2 Risk Management MCP Server",
  "command": "/path/to/backend/bin/mcp",
  "args": [],
  "env": {
    "DATABASE_URL": "postgres://...",
    "JWT_SECRET": "...",
    "JWT_EXPIRY_HOURS": "24"
  }
}
```

OpenCode will:
1. Spawn `bin/mcp` as a child process
2. Send JSON-RPC requests over stdin
3. Receive responses from stdout
4. Session is per-agent-instance (isolated)

### Configuration (Claude Code / Cursor)

Claude Code projects use `claude_resources.json` or project context:

```json
{
  "mcp_servers": {
    "manris": {
      "command": "/path/to/backend/bin/mcp",
      "env": {
        "DATABASE_URL": "...",
        "JWT_SECRET": "..."
      }
    }
  }
}
```

---

## Usage Examples

### Example 1: Login and Create Risk

```python
# Pseudo-code for agent workflow
response1 = call_tool("login", {
    "email": "user@ministry.go.id",
    "password": "secure-password"
})
# Returns: userId, role, accessibleOrgIds, expiresAt

response2 = call_tool("create_and_approve_risk", {
    "title": "Cybersecurity Breach in CCTV System",
    "category": "Technology",
    "organizationId": response1["accessibleOrgIds"][0],
    "description": "Potential intrusion into surveillance network",
    "probability": 4,
    "impact": 5,
    "riskApproverIds": ["approver-uuid"],
    "submissionType": "approval"
})
# Risk created and submitted for approval
```

### Example 2: Monitor Existing Risk

```python
response = call_tool("monitor_and_approve_risk", {
    "riskId": "existing-risk-uuid",
    "assessmentCycle": "2026-H1",
    "riskApproverIds": ["approver-uuid"],
    "submissionType": "approval"
})
# Reassessment created for H1 2026 monitoring
```

---

## Error Handling

All errors are returned as MCP result errors (not protocol-level errors):

```json
{
  "content": [{"type": "text", "text": "error message"}],
  "isError": true
}
```

Common errors:
- `no session` - Call `login` first
- `session expired` - JWT expiry reached. Call `login` again.
- `risk not found` - Risk ID doesn't exist or not in org scope
- `invalid status for update` - Risk not in draft status
- `working paper locked` - Risk has blocking document link

---

## Building & Deployment

### Development

```bash
cd backend
make mcp-build
./bin/mcp  # starts stdio server
```

### Production Build

```bash
cd backend
make mcp-build-prod  # compiles with optimizations
```

Output: `./bin/mcp`

### Docker

```dockerfile
FROM golang:1.25.0-alpine as builder
WORKDIR /app
COPY . .
RUN go build -o bin/mcp ./cmd/mcp

FROM alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/bin/mcp /bin/mcp
ENTRYPOINT ["/bin/mcp"]
```

```bash
docker build -t manris-mcp:latest .
docker run -e DATABASE_URL="..." -e JWT_SECRET="..." manris-mcp:latest
```

---

## Testing

### Unit Tests (Tool Handlers)

```bash
cd backend
go test ./internal/mcp/tools/ -v
go test ./internal/mcp/session/ -v
go test ./internal/mcp/mapping/ -v
```

All tests: `go test ./internal/mcp/... -v`

### Integration Tests (End-to-End)

```bash
cd backend
go test ./internal/mcp/integration/... -v
```

Harness spawns the binary and sends JSON-RPC requests.

---

## Architecture Details

### Session Management

- **Storage**: Atomic pointer (`sync.atomic.Pointer[Session]`)
- **Expiry**: Enforced on every `Get()` call
- **Scope**: Single session per stdio connection
- **Lifetime**: JWT expiry time (default 24 hours)

Session expires after `JWT_EXPIRY_HOURS`. The LLM must call `login` again to refresh.

### Tool Handler Flow

```
1. Tool called with args dict
2. Extract and validate args
3. Get session (returns nil if expired/not logged in)
4. Call usecase with org scope filtering
5. Format output as map[string]interface{}
6. Return as MCP TextContent
```

### No Call to ApprovalActionUseCase

Current implementation: `create_and_approve_risk` and `monitor_and_approve_risk` do NOT call `ApprovalActionUseCase` (approve/reject action). `monitor_and_approve_risk` currently stops after creating reassessment draft and returns draft metadata. It does not submit approval.

---

## Performance Considerations

- **Connection per AI Instance**: Each OpenCode/Claude Code instance spawns a separate server process
- **No Caching**: All requests go to database (session expiry enforced)
- **No Rate Limiting**: Rely on database connection pooling
- **Telemetry**: Uses backend logger (no MCP-specific instrumentation)

---

## Future Enhancements

- [ ] HTTP/SSE transport option
- [ ] Incident/KRI/Control tools
- [ ] Predictive analytics tools
- [ ] Meeting minutes & transcript analysis tools
- [ ] Dashboard tools
- [ ] Resource types (for browsing risk register)
- [ ] Prompt templates for common workflows

---

## Support & Troubleshooting

### Server won't start

```
Error: failed to load config
```

Check `.env` file exists with required variables.

### Session expired error

The 24-hour JWT token expired. Call `login` again.

```json
{
  "content": [{"type": "text", "text": "session expired"}],
  "isError": true
}
```

### Risk not found

Risk doesn't exist or user's org scope doesn't include it.

```json
{
  "content": [{"type": "text", "text": "risk not found"}],
  "isError": true
}
```

### Working paper locked

Risk has an active document link. Update working paper first, then retry.

---

## References

- **MCP Spec**: https://spec.modelcontextprotocol.io/
- **mcp-go**: https://github.com/mark3labs/mcp-go
- **Backend Usecases**: `backend/internal/usecase/`
- **Tool Handlers**: `backend/internal/mcp/tools/`
