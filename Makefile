.PHONY: help setup dev build test clean docker-up docker-down docker-build

help:
	@echo "Available commands:"
	@echo "  make setup        - Install all dependencies"
	@echo "  make dev          - Start all services in development mode"
	@echo "  make build        - Build the frontend for production"
	@echo "  make test         - Run all tests"
	@echo "  make clean        - Clean all build artifacts"
	@echo "  make docker-up    - Start all services with Docker"
	@echo "  make docker-down  - Stop all Docker services"
	@echo "  make docker-build - Build Docker images"

setup:
	npm run setup
	@echo "Setup complete. Don't forget to configure your .env file!"

dev:
	npm run dev

build:
	npm run build

test:
	npm test

clean:
	rm -rf front-ends/credit-cloud-admin/.next
	rm -rf front-ends/credit-cloud-admin/node_modules
	docker-compose -f docker-compose-hasura.yml down -v

docker-up:
	docker-compose -f docker-compose-hasura.yml up

docker-down:
	docker-compose -f docker-compose-hasura.yml down

docker-build:
	docker-compose -f docker-compose-hasura.yml build

# Hasura specific commands
hasura-console:
	npm run hasura:console

hasura-migrate:
	npm run hasura:migrate

hasura-metadata:
	npm run hasura:metadata

# Database commands
db-seed:
	cd hasura && ./load_seeds.sh

db-reset:
	docker-compose -f docker-compose-hasura.yml down -v
	docker-compose -f docker-compose-hasura.yml up -d postgres
	sleep 5
	npm run hasura:migrate
	npm run hasura:metadata
	make db-seed