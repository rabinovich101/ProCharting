# Contributing to ProCharting

Thank you for your interest in contributing to ProCharting! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Prerequisites**
   - Node.js 18+
   - pnpm 8+
   - Git

2. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/ProCharting.git
   cd ProCharting
   pnpm install
   ```

3. **Build**
   ```bash
   pnpm build
   ```

4. **Development Mode**
   ```bash
   pnpm dev
   ```

## Project Structure

- `packages/` - Core packages (monorepo)
  - `core/` - Main chart API
  - `webgpu/` - WebGPU renderer
  - `webgl/` - WebGL2 renderer
  - `data/` - Data management
  - `types/` - TypeScript types
  - `utils/` - Shared utilities
- `examples/` - Example applications
- `benchmarks/` - Performance tests

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types
- Explicit return types for functions
- Use `readonly` where applicable

### Performance
- Minimize allocations
- Use typed arrays for numeric data
- Pool objects when possible
- Profile before optimizing

### Testing
- Write tests for new features
- Maintain > 90% coverage
- Test edge cases

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Run type checking (`pnpm typecheck`)
6. Run linting (`pnpm lint`)
7. Commit with descriptive message
8. Push to your fork
9. Open a Pull Request

## Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `perf:` Performance improvement
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `chore:` Maintenance

Example: `feat: add volume profile chart type`

## Performance Guidelines

When contributing performance-critical code:

1. **Benchmark First**
   - Use the benchmark suite
   - Measure before and after
   - Document improvements

2. **GPU-First**
   - Prefer GPU computation
   - Minimize CPU-GPU transfers
   - Use compute shaders when possible

3. **Memory Efficiency**
   - Use binary formats
   - Pool allocations
   - Avoid GC pressure

## Questions?

- Open an issue for bugs
- Start a discussion for features
- Join our Discord (if applicable)

Thank you for contributing!