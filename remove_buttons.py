import re

with open('src/pages/ProjectDetails.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace <Button ...>Save Progress</Button>
pattern1 = r'<Button[^>]*>\s*Save Progress\s*</Button>'
content = re.sub(pattern1, '', content, flags=re.DOTALL)

# Replace <Button ...>{viewingStepOverride !== null ? 'Save Changes' : 'Save Progress'}</Button>
pattern2 = r'<Button[^>]*>\s*\{viewingStepOverride !== null \? ''Save Changes'' : ''Save Progress''\}\s*</Button>'
content = re.sub(pattern2, '', content, flags=re.DOTALL)

with open('src/pages/ProjectDetails.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
