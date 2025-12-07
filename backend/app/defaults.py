DEFAULT_CODE_SNIPPETS = {
    "javascript": """// Welcome to CodePair!
// Write your JavaScript code here

function greet(name) {
  return `Hello, ${name}!`;
}

console.log(greet('World'));
console.log('2 + 2 =', 2 + 2);
""",
    "python": """# Welcome to CodePair!
# Write your Python code here

def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
print("2 + 2 =", 2 + 2)
""",
    "sql": """-- Welcome to CodePair!
-- Write your SQL code here

SELECT 
    id,
    name,
    email
FROM users
WHERE active = true
ORDER BY created_at DESC
LIMIT 10;
""",
}

SUPPORTED_LANGUAGES = ("javascript", "python", "sql")
