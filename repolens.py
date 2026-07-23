# Welcome to RepoLens! We're here to be your pair programmer anytime you're
# working in VS Code.

# To get started log into your RepoLens account. Click on the RepoLens logo
# (the hexagon) on your VS Code sidebar and click the login button, or open
# the command palette (Ctrl/Cmd+Shift+P) and execute `RepoLens: Login`.

# Let's start looking at how you can get a code review from RepoLens.

# The `Review` tab allows you to get a code review straight away in your IDE
# - You can always get a review of the current file
# - If in Git you can review your current set of uncommitted changes, 
#   or your current branch compared to the default branch

# If you want reviews when you open a PR, you can add RepoLens to your GitHub or GitLab repos.


# Now let's move on to the `Chat` tab.

# Above each function you'll see a few commands - these are Code Lenses that
# you can use to interact with RepoLens. Try clicking on "Ask RepoLens" and
# asking it to update the code to use `dateutil`. The answer will appear in
# the RepoLens sidebar chat.

def days_between_dates(date1, date2):
    d1 = datetime.datetime.strptime(date1, '%Y-%m-%d').date()
    d2 = datetime.datetime.strptime(date2, '%Y-%m-%d').date()
    delta = d2 - d1
    return delta.days


# With the Ask RepoLens command or the chat in the sidebar you can ask RepoLens
# questions, have it write new code for you, or update existing code.

# RepoLens also has a series of "recipes" to do different things with code.
# Try clicking the Generate Docstrings lens above this next function:

def calculate_weighted_moving_average(prices, weights):
    if not prices or not weights:
        raise ValueError("Both prices and weights must be provided.")
    
    if len(weights) > len(prices):
        raise ValueError("Length of weights must be less than or equal to length of prices.")
    
    total_weight = sum(weights)
    normalized_weights = [w / total_weight for w in weights]
    
    wma = []
    for i in range(len(prices) - len(weights) + 1):
        weighted_sum = sum(prices[i + j] * normalized_weights[j] for j in range(len(weights)))
        wma.append(weighted_sum)
    
    return wma

# Now try clicking Generate Tests or Explain Code for the same function!

# There is also a recipe for generating diagrams.
# You can access this by clicking Ask RepoLens and choosing it from the 
# dropdown or by selecting a section of code and clicking the recipes button 
# in the sidebar.

# In your code you'll also see sections start to get underlined.
# This means RepoLens has a suggestion to improve it.

def refactoring_example(spellbook):
    result = []
    for spell in spellbook:
        if spell.is_awesome:
            result.append(spell)
    print(result)

# Hover over the underlined code to see details of the changes including a diff.

# You can accept RepoLens's changes with the quick fix action. Put your cursor
# on the highlighted line and click on the lightbulb. 
# 
# Or use the quick-fix hotkey (Ctrl .) or (Cmd .)  and then choose 
# "RepoLens - Convert for loop...". This will instantly replace the code with 
# the improved version.

# The Problems pane (Ctrl/Cmd+Shift+M) shows all of RepoLens's suggestions.

# RepoLens also provides code metrics for each function to give you insight into
# code quality - hover over the function definition below to see this report.

def magical_hoist(magic):
    if is_powerful(magic):
        result = 'Magic'
    else:
        print("Not powerful.")
        result = 'Magic'
    print(result)

# What if we don't want to make the change RepoLens suggests?

# You can skip/ignore changes from RepoLens in a few ways:

# 1) In the quick fix menu choose "RepoLens - Skip suggested refactoring"
#    This adds a comment to the function telling RepoLens not to make the change.

# 2) In the quick fix menu choose "RepoLens - Never show me this refactoring"
#    This tells RepoLens to never suggest this type of suggestion. This config
#    is stored in a configuration file on your machine.

# 3) Click on the RepoLens button in the Status Bar (typically the bottom of
#    the VS Code window) to bring up the RepoLens Hub. Click on "Settings" and
#    then you can toggle individual rule types on or off

# For more details check out our documentation here:
# https://repolens-ai.github.io/docs/

# If you want to play around a bit more, here are some more examples of RepoLens's in-line suggestions.
# These include cases where RepoLens has chained together suggestions to come
# up with more powerful refactorings.

def find_more(magicks):
    powerful_magic = []
    for magic in magicks:
        if not is_powerful(magic):
            continue
        powerful_magic.append(magic)
    return powerful_magic


def is_powerful(magic):
    if magic == 'RepoLens':
        return True
    elif magic == 'More RepoLens':
        return True
    else:
        return False


def print_all(spells: list):
    for i in range(len(spells)):
        print(spells[i])
