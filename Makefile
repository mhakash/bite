.PHONY: build-frontend build-backend dev-frontend dev-backend

# Frontend deploys separately (e.g. Vercel), which builds it on its own —
# this target is just for local testing of the production build.
build-frontend:
	cd frontend && npm install && npm run build

build-backend:
	cd backend && go build -o bin/bite-server ./cmd/server

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && go run ./cmd/server
