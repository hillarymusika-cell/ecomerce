// BuildKit bake file – parallel optimized builds
// Usage:
//   docker buildx bake
//   docker buildx bake backend frontend
//   docker buildx bake --set backend.tags=ecomerce-backend:dev

variable "VITE_API_URL" {
  default = "http://localhost:8000"
}

variable "TAG" {
  default = "local"
}

group "default" {
  targets = ["backend", "frontend"]
}

target "backend" {
  context    = "."
  dockerfile = "Dockerfile"
  target     = "runtime"
  tags       = ["ecomerce-backend:${TAG}"]
  cache-from = ["type=gha,scope=backend"]
  cache-to   = ["type=gha,mode=max,scope=backend"]
  platforms  = ["linux/amd64"]
}

target "frontend" {
  context    = "."
  dockerfile = "Dockerfile.frontend"
  target     = "runtime"
  tags       = ["ecomerce-frontend:${TAG}"]
  args = {
    VITE_API_URL = VITE_API_URL
  }
  cache-from = ["type=gha,scope=frontend"]
  cache-to   = ["type=gha,mode=max,scope=frontend"]
  platforms  = ["linux/amd64"]
}
