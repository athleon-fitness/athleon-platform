# Athleon Local Development Environment

## Quick Start

```bash
cd local-dev
./start.sh
```

## Services

- **API Gateway**: http://localhost:3001
- **DynamoDB**: http://localhost:8000  
- **EventBridge**: http://localhost:4566 (LocalStack)
- **Frontend**: http://localhost:3000

## Architecture

```
Frontend (3000) → API Gateway (3001) → Lambda Handlers → DynamoDB (8000)
                                    ↓
                              EventBridge (4566)
```

## Testing Endpoints

```bash
# Organizations
curl http://localhost:3001/organizations

# Events  
curl http://localhost:3001/competitions

# Scores
curl http://localhost:3001/scores
```

## Environment Variables

All Lambda functions use local endpoints:
- `DYNAMODB_ENDPOINT=http://localhost:8000`
- `EVENTBRIDGE_ENDPOINT=http://localhost:4566`

## Cleanup

```bash
docker-compose down
```
