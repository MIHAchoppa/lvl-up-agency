# Contributing to Level Up Agency

Thank you for your interest in contributing to the Level Up Agency platform! This guide will help you get started.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- **Node.js** 20 or higher
- **Python** 3.11 or higher
- **MongoDB** 7.0 or higher
- **Docker** and **Docker Compose** (optional but recommended)
- **Git**

### Local Development Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" button on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/lvl-up-agency.git
   cd lvl-up-agency
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/MIHAchoppa/lvl-up-agency.git
   ```

3. **Set up environment**
   ```bash
   # Copy environment template
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Option A: Docker Development**
   ```bash
   # Start all services with Docker
   ./deploy.sh
   ```

5. **Option B: Manual Development**
   
   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   
   **Backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn server:app --reload
   ```
   
   **Backend Node:**
   ```bash
   cd backend-node
   npm install
   npm run dev
   ```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Creating a Feature Branch

```bash
# Update your local repository
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

## Coding Standards

### JavaScript/React

- Use **ES6+** syntax
- Follow **Airbnb JavaScript Style Guide**
- Use **functional components** with hooks
- Component files should be in **PascalCase**: `MyComponent.jsx`
- Utility files should be in **camelCase**: `helperUtils.js`

Example:
```javascript
// Good
const MyComponent = () => {
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Effect logic
  }, []);
  
  return <div>Content</div>;
};

export default MyComponent;
```

### Python/FastAPI

- Follow **PEP 8** style guide
- Use **type hints** for function parameters and return values
- Use **async/await** for I/O operations
- Docstrings for all public functions and classes

Example:
```python
from fastapi import APIRouter, HTTPException
from typing import List, Optional

router = APIRouter()

@router.get("/items/{item_id}")
async def get_item(item_id: str) -> dict:
    """
    Retrieve an item by ID.
    
    Args:
        item_id: The unique identifier for the item
        
    Returns:
        dict: Item details
    """
    # Function logic
    return {"item_id": item_id}
```

### CSS/Styling

- Use **Tailwind CSS** utility classes
- Follow **mobile-first** approach
- Custom CSS only when Tailwind is insufficient
- Use **CSS variables** for theme values

### File Organization

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Base UI components
│   │   └── dashboard/       # Feature components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom hooks
│   ├── context/             # React context
│   ├── lib/                 # Utilities
│   └── assets/              # Static assets

backend/
├── routers/                 # API route handlers
├── services/                # Business logic
├── models/                  # Data models
└── utils/                   # Utilities
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Good commit messages
feat(auth): add JWT token refresh mechanism
fix(dashboard): resolve chart rendering issue
docs(readme): update installation instructions
style(frontend): format code with prettier
refactor(api): simplify user authentication logic
test(backend): add unit tests for user service
chore(deps): update dependencies to latest versions

# Bad commit messages (avoid these)
fix bug
update code
changes
WIP
```

## Pull Request Process

### Before Submitting

1. **Update your branch**
   ```bash
   git checkout main
   git pull upstream main
   git checkout feature/your-feature
   git rebase main
   ```

2. **Run tests**
   ```bash
   # Frontend
   cd frontend && npm test
   
   # Backend
   cd backend && pytest
   ```

3. **Lint your code**
   ```bash
   # Frontend
   cd frontend && npm run lint
   
   # Backend
   cd backend && flake8
   ```

4. **Build successfully**
   ```bash
   # Frontend
   cd frontend && npm run build
   ```

### Submitting a Pull Request

1. **Push your changes**
   ```bash
   git push origin feature/your-feature
   ```

2. **Create Pull Request**
   - Go to GitHub and create a PR from your fork
   - Use a clear, descriptive title
   - Fill out the PR template completely
   - Link related issues (e.g., "Closes #123")

3. **PR Title Format**
   ```
   feat: Add voice assistant feature
   fix: Resolve authentication timeout issue
   docs: Update deployment guide
   ```

4. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings generated
   - [ ] Tests pass locally
   - [ ] Dependent changes merged

   ## Screenshots (if applicable)
   
   ## Related Issues
   Closes #issue_number
   ```

### Review Process

- At least one approval required
- All CI checks must pass
- Resolve all review comments
- Squash commits if requested
- Maintainers will merge when ready

## Testing

### Frontend Testing

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Backend Testing

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

### Integration Testing

```bash
# Start all services
docker-compose up -d

# Run integration tests
bash tests/test_auth_and_data.sh
```

## Documentation

- Update README.md for user-facing changes
- Update DEPLOY.md for deployment changes
- Add comments for complex logic
- Update API documentation in code
- Include JSDoc/docstrings for functions

## Questions?

- Open an issue for bugs or feature requests
- Reach out to maintainers for questions
- Check existing issues and PRs first

---

Thank you for contributing to Level Up Agency! 🚀
