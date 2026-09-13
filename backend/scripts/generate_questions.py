#!/usr/bin/env python3
"""
One-time (but re-runnable) generator for the K-6 question bank.

Produces 50 questions per grade level (K through 6 = 350 total) across
several distinct math areas per grade, with programmatically verified
correct answers and non-duplicate, non-matching distractors. Prints a
ready-to-paste SEED_QUESTIONS Python literal to stdout, which is what
backend/seed_data.py's content is built from.

Re-run this (with a different --seed) any time you want a fresh set of
350 questions instead of hand-editing 350 dicts directly.

Usage:
    python3 generate_questions.py > /tmp/generated_questions.py
"""

import random
import sys
from fractions import Fraction


def make_options(rng, correct, distractors):
    """Shuffles correct + distractors into a 4-option list, returns (options, correct_index)."""
    distractors = list(dict.fromkeys(d for d in distractors if d != correct))[:3]
    filler_n = 0
    while len(distractors) < 3:
        filler_n += 1
        if isinstance(correct, str):
            filler = f"{correct}(alt {filler_n})"
        else:
            filler = correct + filler_n * 7
        if filler != correct and filler not in distractors:
            distractors.append(filler)
    opts = [correct] + distractors
    order = list(range(4))
    rng.shuffle(order)
    shuffled = [opts[i] for i in order]
    return [str(o) for o in shuffled], shuffled.index(correct)


def numeric_distractors(rng, correct, spread=(1, 2, 3, 5), min_val=None):
    out = set()
    tries = 0
    while len(out) < 3 and tries < 60:
        tries += 1
        off = rng.choice(spread) * rng.choice([-1, 1])
        val = correct + off
        if val == correct:
            continue
        if min_val is not None and val < min_val:
            continue
        out.add(val)
    return list(out)


def q_counting(rng):
    n = rng.randint(3, 10)
    item = rng.choice(["apple", "star", "block", "ball", "cat", "flower", "cup", "book", "bird", "cookie"])
    correct = n
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=1)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "groups", "groupCount": 1, "itemsPerGroup": n, "itemLabel": item}
    return "Counting", f"How many {item}s are there?", options, idx, visual


def q_number_recognition(rng):
    n = rng.randint(1, 30)
    correct = n
    distractors = numeric_distractors(rng, correct, spread=(1, 2, 3), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    return "Number Recognition", f"Which number is this: {n}?", options, idx, None


def q_comparing_k(rng):
    a, b = rng.sample(range(1, 10), 2)
    bigger = max(a, b)
    options = [str(a), str(b), "They are the same", "Not sure"]
    correct_idx = options.index(str(bigger))
    visual = {"type": "compare_groups", "groupA": {"count": a, "label": str(a)}, "groupB": {"count": b, "label": str(b)}}
    return "Comparing Numbers", f"Which number is bigger: {a} or {b}?", options, correct_idx, visual


def q_shapes(rng):
    shapes = [
        ("Triangle", 3), ("Square", 4), ("Rectangle", 4), ("Pentagon", 5),
        ("Hexagon", 6), ("Octagon", 8), ("Circle", 0),
    ]
    target_name, sides = rng.choice([s for s in shapes if s[1] > 0])
    # Never let a shape with the SAME side count appear as a distractor --
    # e.g. Square and Rectangle both have 4 sides, so a "which has 4
    # sides?" question with both as options would be genuinely ambiguous.
    eligible_others = [s[0] for s in shapes if s[0] != target_name and s[1] != sides]
    others = rng.sample(eligible_others, 3)
    options = [target_name] + others
    rng.shuffle(options)
    idx = options.index(target_name)
    visual = {"type": "shape_row", "shapes": [{"name": o} for o in options]}
    q_word = "no straight sides" if sides == 0 else f"{sides} sides"
    return "Shapes", f"Which shape has {q_word}?", options, idx, visual


def q_patterns_k(rng):
    units = [
        ["red", "blue"], ["circle", "square"], ["big", "small"],
        ["sun", "moon"], ["up", "down"], ["cat", "dog"], ["1", "2"],
    ]
    unit = rng.choice(units)
    seq = (unit * 3)[:5]
    next_item = unit[len(seq) % len(unit)]
    others = [x for x in unit if x != next_item] or ["star"]
    distractor_pool = list({*others, "triangle", "yellow", "green", "3", "4"} - {next_item})
    distractors = rng.sample(distractor_pool, min(3, len(distractor_pool)))
    while len(distractors) < 3:
        distractors.append(f"option{len(distractors)}")
    options, idx = make_options(rng, next_item, distractors)
    return "Patterns", f"What comes next in the pattern: {', '.join(seq)}, __?", options, idx, None


ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"]
SPATIAL_PAIRS = [
    ("ball", "box"), ("book", "shelf"), ("cat", "table"), ("shoe", "bed"),
    ("bird", "nest"), ("fish", "bowl"), ("kite", "tree"), ("apple", "basket"),
]
SPATIAL_RELATIONS = ["above", "below", "next to", "behind", "in front of"]


def q_positional(rng):
    kind = rng.choice(["ordinal_front", "ordinal_next", "spatial"])

    if kind == "ordinal_front":
        n = rng.randint(2, 10)
        correct = str(n - 1)
        distractors = numeric_distractors(rng, n - 1, spread=(1, 2), min_val=0)
        options, idx = make_options(rng, correct, distractors)
        return "Positional Words", f"If you are {ORDINALS[n-1]} in line, how many people are in front of you?", options, idx, None

    if kind == "ordinal_next":
        n = rng.randint(1, 9)
        correct = ORDINALS[n]
        distractor_positions = numeric_distractors(rng, n, spread=(1, 2), min_val=0)
        distractors = [ORDINALS[d] for d in distractor_positions if 0 <= d < len(ORDINALS)]
        options, idx = make_options(rng, correct, distractors)
        return "Positional Words", f"Which position comes right after {ORDINALS[n-1]}?", options, idx, None

    a, b = rng.choice(SPATIAL_PAIRS)
    relation = rng.choice(SPATIAL_RELATIONS)
    distractors = rng.sample([r for r in SPATIAL_RELATIONS if r != relation], 3)
    options, idx = make_options(rng, relation, distractors)
    return "Positional Words", f"If a {a} is {relation} a {b}, where is the {a} relative to the {b}?", options, idx, None


def q_add_k(rng):
    a, b = rng.randint(1, 3), rng.randint(1, 2)
    correct = a + b
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "base10", "operator": "+", "a": {"tens": 0, "ones": a, "label": str(a)}, "b": {"tens": 0, "ones": b, "label": str(b)}}
    return "Addition", f"What is {a} + {b}?", options, idx, visual


def q_sub_k(rng):
    a = rng.randint(2, 5)
    b = rng.randint(1, a)
    correct = a - b
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "base10", "operator": "-", "a": {"tens": 0, "ones": a, "label": str(a)}, "b": {"tens": 0, "ones": b, "label": str(b)}}
    return "Subtraction", f"What is {a} - {b}?", options, idx, visual


SORTING_CATEGORIES = {
    "fruits": ["Apple", "Banana", "Orange", "Grape", "Mango"],
    "animals": ["Dog", "Cat", "Fish", "Bird", "Rabbit"],
    "shapes": ["Circle", "Square", "Triangle", "Hexagon", "Oval"],
    "colors": ["Red", "Blue", "Green", "Yellow", "Purple"],
    "vehicles": ["Car", "Truck", "Bike", "Bus", "Train"],
    "weather": ["Sunny", "Rainy", "Snowy", "Windy", "Cloudy"],
    "clothing": ["Shirt", "Pants", "Hat", "Sock", "Glove"],
    "furniture": ["Chair", "Table", "Bed", "Sofa", "Desk"],
}


def q_sorting(rng):
    main_cat, odd_cat = rng.sample(list(SORTING_CATEGORIES.keys()), 2)
    main_items = rng.sample(SORTING_CATEGORIES[main_cat], 3)
    odd_item = rng.choice(SORTING_CATEGORIES[odd_cat])
    options = main_items + [odd_item]
    rng.shuffle(options)
    idx = options.index(odd_item)
    return "Sorting", "Which one does not belong with the others?", options, idx, None


KINDERGARTEN_GENERATORS = [
    (q_counting, 20), (q_number_recognition, 20), (q_comparing_k, 10), (q_shapes, 10),
    (q_patterns_k, 6), (q_positional, 20), (q_add_k, 5), (q_sub_k, 5), (q_sorting, 20),
]


def q_add_1(rng):
    a, b = rng.randint(1, 12), rng.randint(1, 8)
    correct = a + b
    distractors = numeric_distractors(rng, correct, min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "base10", "operator": "+", "a": {"tens": 0, "ones": a, "label": str(a)}, "b": {"tens": 0, "ones": b, "label": str(b)}} if a < 10 and b < 10 else None
    return "Addition", f"What is {a} + {b}?", options, idx, visual


def q_sub_1(rng):
    a = rng.randint(5, 20)
    b = rng.randint(1, a)
    correct = a - b
    distractors = numeric_distractors(rng, correct, min_val=0)
    options, idx = make_options(rng, correct, distractors)
    return "Subtraction", f"What is {a} - {b}?", options, idx, None


def q_place_value_1(rng):
    tens = rng.randint(1, 9)
    ones = rng.randint(0, 9)
    n = tens * 10 + ones
    which = rng.choice(["tens", "ones"])
    correct = tens if which == "tens" else ones
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "place_value", "number": n, "highlight": which}
    return "Place Value", f"In the number {n}, what digit is in the {which} place?", options, idx, visual


def q_compare_1(rng):
    a, b = rng.sample(range(1, 50), 2)
    correct = "<" if a < b else ">"
    options = ["<", ">", "=", "Not sure"]
    idx = options.index(correct)
    return "Comparing Numbers", f"Which symbol makes this true: {a} __ {b}?", options, idx, None


def q_shapes_1(rng):
    shape3d = [
        ("Cube", "6 equal square faces"),
        ("Sphere", "no flat faces at all -- it rolls everywhere"),
        ("Cylinder", "2 flat circular faces and 1 curved side"),
        ("Cone", "1 flat circular face and comes to a point"),
        ("Rectangular Prism", "6 rectangular faces that are not all the same size"),
        ("Square Pyramid", "1 flat square face and 4 triangle faces meeting at a point"),
    ]
    name, hint = rng.choice(shape3d)
    others = rng.sample([s[0] for s in shape3d if s[0] != name], 3)
    options = [name] + others
    rng.shuffle(options)
    idx = options.index(name)
    return "Shapes", f"Which solid shape has {hint}?", options, idx, None


def q_measurement_1(rng):
    items = [
        ("a pencil", "a school bus"), ("a shoe", "a car"), ("an ant", "an elephant"),
        ("a mouse", "a whale"), ("a spoon", "a ladder"), ("a marble", "a beach ball"),
        ("a paperclip", "a bicycle"), ("a button", "a door"), ("a crayon", "a table"),
        ("a coin", "a swimming pool"), ("a leaf", "a tree"),
    ]
    small, big = rng.choice(items)
    ask_longer = rng.choice([True, False])
    if ask_longer:
        question = f"Which is longer: {small} or {big}?"
        correct = big
    else:
        question = f"Which is shorter: {small} or {big}?"
        correct = small
    options = [small, big, "They are the same length", "Not sure"]
    idx = options.index(correct)
    return "Measurement", question, options, idx, None


def q_time_1(rng):
    hour = rng.randint(1, 12)
    minute = rng.choice([0, 30])
    label = f"{hour}:00" if minute == 0 else f"{hour}:30"
    phrase = "o'clock" if minute == 0 else "half past"
    correct = label
    distractor_hours = numeric_distractors(rng, hour, spread=(1, 2), min_val=1)
    distractors = [f"{h}:00" if minute == 0 else f"{h}:30" for h in distractor_hours]
    options, idx = make_options(rng, correct, distractors)
    return "Time", f"What time is shown when the clock reads {phrase} {hour}?", options, idx, None


def q_money_1(rng):
    coins = [("penny", 1), ("nickel", 5), ("dime", 10), ("quarter", 25)]
    if rng.random() < 0.5:
        name, value = rng.choice(coins)
        correct = value
        distractors = numeric_distractors(rng, correct, spread=(1, 4, 5, 10), min_val=1)
        options, idx = make_options(rng, correct, distractors)
        return "Money", f"How many cents is one {name} worth?", options, idx, None
    else:
        count = rng.randint(2, 5)
        name, value = rng.choice(coins)
        correct = count * value
        distractors = numeric_distractors(rng, correct, spread=(value, 1, 2), min_val=1)
        options, idx = make_options(rng, correct, distractors)
        plural = "pennies" if name == "penny" else f"{name}s"
        return "Money", f"How many cents is {count} {plural} worth in total?", options, idx, None


def q_word_problem_1(rng):
    a = rng.randint(1, 6)
    b = rng.randint(1, 6)
    names = ["Mia", "Sam", "Leo", "Ava", "Ben"]
    items = ["balloons", "stickers", "crayons", "marbles"]
    name = rng.choice(names)
    item = rng.choice(items)
    correct = a + b
    distractors = numeric_distractors(rng, correct, min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "compare_groups", "groupA": {"count": a, "label": "first"}, "groupB": {"count": b, "label": "more"}}
    return "Word Problem", f"{name} has {a} {item}. A friend gives {name} {b} more. How many {item} does {name} have now?", options, idx, visual


GRADE1_GENERATORS = [
    (q_add_1, 8), (q_sub_1, 8), (q_place_value_1, 8), (q_compare_1, 12), (q_shapes_1, 10),
    (q_measurement_1, 8), (q_time_1, 8), (q_money_1, 10), (q_word_problem_1, 5),
]


def q_add_2(rng):
    a, b = rng.randint(15, 89), rng.randint(10, 89)
    correct = a + b
    distractors = numeric_distractors(rng, correct, min_val=0)
    options, idx = make_options(rng, correct, distractors)
    def tens_ones(n):
        return {"tens": n // 10, "ones": n % 10}
    visual = {"type": "base10", "operator": "+", "a": {**tens_ones(a), "label": str(a)}, "b": {**tens_ones(b), "label": str(b)}}
    return "Addition", f"What is {a} + {b}?", options, idx, visual


def q_sub_2(rng):
    a = rng.randint(20, 99)
    b = rng.randint(10, a)
    correct = a - b
    distractors = numeric_distractors(rng, correct, min_val=0)
    options, idx = make_options(rng, correct, distractors)
    def tens_ones(n):
        return {"tens": n // 10, "ones": n % 10}
    visual = {"type": "base10", "operator": "-", "a": {**tens_ones(a), "label": str(a)}, "b": {**tens_ones(b), "label": str(b)}}
    return "Subtraction", f"What is {a} - {b}?", options, idx, visual


def q_place_value_2(rng):
    h = rng.randint(1, 9)
    t = rng.randint(0, 9)
    o = rng.randint(0, 9)
    n = h * 100 + t * 10 + o
    which = rng.choice(["hundreds", "tens", "ones"])
    correct = {"hundreds": h, "tens": t, "ones": o}[which]
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "place_value", "number": n, "highlight": which}
    return "Place Value", f"In the number {n}, what digit is in the {which} place?", options, idx, visual


def q_skip_counting(rng):
    step = rng.choice([2, 3, 5, 10])
    start = rng.randint(1, 12) * step
    seq = [start + step * i for i in range(4)]
    correct = start + step * 4
    distractors = numeric_distractors(rng, correct, spread=(step, step * 2, 1), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    return "Skip Counting", f"Count by {step}s: {', '.join(map(str, seq))}, __?", options, idx, None


def q_early_multiplication(rng):
    groups = rng.randint(2, 7)
    per_group = rng.randint(2, 7)
    correct = groups * per_group
    distractors = numeric_distractors(rng, correct, spread=(1, 2, per_group), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "groups", "groupCount": groups, "itemsPerGroup": per_group, "itemLabel": "dot"}
    return "Early Multiplication", f"There are {groups} groups with {per_group} dots in each group. How many dots in total?", options, idx, visual


def q_measurement_2(rng):
    length_cm = rng.randint(3, 20)
    correct = length_cm
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=1)
    options, idx = make_options(rng, correct, distractors)
    return "Measurement", f"A pencil measured with a ruler is {length_cm} centimeters long. How many centimeters is that?", options, idx, None


def q_time_2(rng):
    hour = rng.randint(1, 12)
    minute = rng.choice([5, 10, 15, 20, 25, 35, 40, 45, 50, 55])
    correct = f"{hour}:{minute:02d}"
    distractor_minutes = numeric_distractors(rng, minute, spread=(5, 10), min_val=0)
    distractors = [f"{hour}:{m % 60:02d}" for m in distractor_minutes]
    options, idx = make_options(rng, correct, distractors)
    return "Time", f"A clock's hour hand is near {hour} and the minute hand shows {minute} minutes. What time is it?", options, idx, None


def q_money_2(rng):
    coins = rng.sample([1, 5, 10, 25], rng.randint(2, 3))
    correct = sum(coins)
    names = {1: "penny", 5: "nickel", 10: "dime", 25: "quarter"}
    desc = " and a ".join(names[c] for c in coins)
    distractors = numeric_distractors(rng, correct, spread=(1, 5, 10), min_val=1)
    options, idx = make_options(rng, correct, distractors)
    return "Money", f"How many cents is a {desc} worth together?", options, idx, None


def q_word_problem_2(rng):
    bags = rng.randint(2, 6)
    per_bag = rng.randint(3, 9)
    correct = bags * per_bag
    distractors = numeric_distractors(rng, correct, spread=(1, per_bag, bags), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "groups", "groupCount": bags, "itemsPerGroup": per_bag, "itemLabel": "apple"}
    return "Word Problem", f"A store has {bags} boxes with {per_bag} apples in each box. How many apples are there in total?", options, idx, visual


GRADE2_GENERATORS = [
    (q_add_2, 8), (q_sub_2, 8), (q_place_value_2, 8), (q_skip_counting, 20), (q_early_multiplication, 20),
    (q_measurement_2, 8), (q_time_2, 8), (q_money_2, 12), (q_word_problem_2, 5),
]


def q_multiplication_3(rng):
    a, b = rng.randint(2, 9), rng.randint(2, 9)
    correct = a * b
    distractors = numeric_distractors(rng, correct, spread=(a, b, 1, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "array_grid", "rows": a, "cols": b, "label": f"{a} rows x {b} columns"}
    return "Multiplication", f"What is {a} x {b}?", options, idx, visual


def q_division_3(rng):
    b = rng.randint(2, 9)
    correct = rng.randint(2, 9)
    a = b * correct
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "groups", "groupCount": b, "itemsPerGroup": correct, "itemLabel": "dot"}
    return "Division", f"What is {a} divided by {b}?", options, idx, visual


def q_fractions_3(rng):
    denom = rng.choice([2, 3, 4, 6, 8])
    num = rng.randint(1, denom - 1)
    correct = f"{num}/{denom}"
    other_denoms = [d for d in [2, 3, 4, 6, 8] if d != denom]
    distractors = []
    for d in rng.sample(other_denoms, min(3, len(other_denoms))):
        n = rng.randint(1, d - 1)
        distractors.append(f"{n}/{d}")
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "fraction_bars", "bars": [{"numerator": num, "denominator": denom, "label": correct}]}
    return "Fractions", f"What fraction of the bar is shaded if {num} out of {denom} equal parts are shaded?", options, idx, visual


def q_area_perimeter_3(rng):
    length, width = rng.randint(3, 12), rng.randint(2, 10)
    kind = rng.choice(["area", "perimeter"])
    correct = length * width if kind == "area" else 2 * (length + width)
    distractors = numeric_distractors(rng, correct, spread=(length, width, 1, 2), min_val=1)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "area_model", "widthParts": [length], "heightParts": [width]} if kind == "area" else None
    return "Area and Perimeter", f"What is the {kind} of a rectangle with length {length} and width {width}?", options, idx, visual


def q_rounding_3(rng):
    n = rng.randint(100, 999)
    correct = round(n, -1)
    distractors = numeric_distractors(rng, correct, spread=(10, 20), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "number_line", "min": (n // 10) * 10 - 10, "max": (n // 10) * 10 + 10, "step": 10, "marks": [{"value": n, "label": str(n)}]}
    return "Rounding", f"What is {n} rounded to the nearest ten?", options, idx, visual


def q_place_value_3(rng):
    th = rng.randint(1, 9)
    h = rng.randint(0, 9)
    t = rng.randint(0, 9)
    o = rng.randint(0, 9)
    n = th * 1000 + h * 100 + t * 10 + o
    which = rng.choice(["thousands", "hundreds", "tens", "ones"])
    correct = {"thousands": th, "hundreds": h, "tens": t, "ones": o}[which]
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    return "Place Value", f"In the number {n:,}, what digit is in the {which} place?", options, idx, None


def q_time_elapsed_3(rng):
    start_h = rng.randint(1, 10)
    elapsed = rng.choice([30, 45, 60, 90, 120])
    correct_h = start_h + elapsed // 60
    correct_m = elapsed % 60
    correct = f"{correct_h}:{correct_m:02d}" if correct_m else f"{correct_h}:00"
    distractor_hours = numeric_distractors(rng, correct_h, spread=(1, 2), min_val=1)
    distractors = [f"{h}:{correct_m:02d}" if correct_m else f"{h}:00" for h in distractor_hours]
    options, idx = make_options(rng, correct, distractors)
    return "Time", f"A movie starts at {start_h}:00 and lasts {elapsed} minutes. What time does it end?", options, idx, None


def q_word_problem_3(rng):
    total = rng.randint(20, 80)
    groups = rng.choice([2, 4, 5])
    while total % groups != 0:
        total += 1
    per_group = total // groups
    distractors = numeric_distractors(rng, per_group, spread=(1, 2, groups), min_val=1)
    options, idx = make_options(rng, per_group, distractors)
    visual = {"type": "groups", "groupCount": groups, "itemsPerGroup": per_group, "itemLabel": "book"}
    return "Word Problem", f"A library has {total} books to place equally on {groups} shelves. How many books go on each shelf?", options, idx, visual


def q_patterns_data_3(rng):
    start = rng.randint(2, 8)
    step = rng.randint(2, 5)
    seq = [start + step * i for i in range(4)]
    correct = start + step * 4
    distractors = numeric_distractors(rng, correct, spread=(step, 1, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    return "Patterns", f"What is the next number in the pattern: {', '.join(map(str, seq))}, __?", options, idx, None


GRADE3_GENERATORS = [
    (q_multiplication_3, 20), (q_division_3, 20), (q_fractions_3, 6), (q_area_perimeter_3, 20),
    (q_rounding_3, 20), (q_place_value_3, 6), (q_time_elapsed_3, 6), (q_word_problem_3, 5), (q_patterns_data_3, 16),
]


def q_multi_mult_4(rng):
    a = rng.randint(11, 39)
    b = rng.randint(11, 19)
    correct = a * b
    distractors = numeric_distractors(rng, correct, spread=(a, b, 10, 1), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    a_tens, a_ones = (a // 10) * 10, a % 10
    b_tens, b_ones = (b // 10) * 10, b % 10
    visual = {"type": "area_model", "widthParts": [w for w in [a_tens, a_ones] if w], "heightParts": [h for h in [b_tens, b_ones] if h]}
    return "Multi-digit Multiplication", f"What is {a} x {b}?", options, idx, visual


def q_multi_div_4(rng):
    b = rng.randint(11, 20)
    correct = rng.randint(4, 15)
    a = b * correct
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=1)
    options, idx = make_options(rng, correct, distractors)
    return "Long Division", f"What is {a} divided by {b}?", options, idx, None


def q_fractions_equiv_4(rng):
    denom = rng.choice([2, 3, 4, 5])
    num = rng.randint(1, denom - 1)
    mult = rng.randint(2, 4)
    correct = f"{num * mult}/{denom * mult}"
    distractors = [f"{num * mult + o}/{denom * mult}" for o in (1, -1, 2) if num * mult + o > 0]
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "fraction_bars", "bars": [{"numerator": num, "denominator": denom, "label": f"{num}/{denom}"}]}
    return "Fractions", f"Which fraction is equivalent to {num}/{denom}?", options, idx, visual


def q_fractions_add_4(rng):
    denom = rng.choice([4, 5, 6, 8])
    n1 = rng.randint(1, denom - 2)
    n2 = rng.randint(1, denom - n1 - 1) if denom - n1 - 1 >= 1 else 1
    correct = f"{n1 + n2}/{denom}"
    distractors = [f"{n1 + n2 + o}/{denom}" for o in (1, -1, 2) if 0 < n1 + n2 + o <= denom * 2]
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "fraction_bars", "bars": [{"numerator": n1, "denominator": denom, "label": f"{n1}/{denom}"}, {"numerator": n2, "denominator": denom, "label": f"{n2}/{denom}"}]}
    return "Fractions", f"What is {n1}/{denom} + {n2}/{denom}?", options, idx, visual


def q_decimals_intro_4(rng):
    whole = rng.randint(0, 9)
    tenths = rng.randint(1, 9)
    n = f"{whole}.{tenths}"
    correct = tenths
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    return "Decimals", f"In the number {n}, what digit is in the tenths place?", options, idx, None


def q_factors_multiples_4(rng):
    kind = rng.choice(["factor", "multiple"])
    n = rng.randint(2, 12)
    if kind == "factor":
        target = n * rng.randint(2, 6)
        correct = n
        distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=1)
        options, idx = make_options(rng, correct, distractors)
        return "Factors and Multiples", f"Which of these is a factor of {target}? (Hint: {n} divides evenly into it)", options, idx, None
    else:
        correct = n * rng.randint(2, 5)
        distractors = numeric_distractors(rng, correct, spread=(1, 2, n), min_val=n)
        options, idx = make_options(rng, correct, distractors)
        return "Factors and Multiples", f"Which of these is a multiple of {n}?", options, idx, None


def q_geometry_angles_4(rng):
    angle_types = [
        ("Acute", "less than 90 degrees"), ("Right", "exactly 90 degrees"),
        ("Obtuse", "more than 90 but less than 180 degrees"), ("Straight", "exactly 180 degrees"),
        ("Reflex", "more than 180 but less than 360 degrees"),
    ]
    name, hint = rng.choice(angle_types)
    others = rng.sample([a[0] for a in angle_types if a[0] != name], 3)
    options = [name] + others
    rng.shuffle(options)
    idx = options.index(name)
    return "Geometry", f"What type of angle measures {hint}?", options, idx, None


def q_measurement_conv_4(rng):
    feet = rng.randint(1, 10)
    correct = feet * 12
    distractors = numeric_distractors(rng, correct, spread=(1, 12, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    return "Measurement", f"How many inches are in {feet} feet? (1 foot = 12 inches)", options, idx, None


def q_word_problem_4(rng):
    price = rng.randint(2, 9)
    qty = rng.randint(3, 12)
    correct = price * qty
    distractors = numeric_distractors(rng, correct, spread=(price, qty, 1), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    return "Word Problem", f"Pencils cost ${price} each. How much do {qty} pencils cost in total?", options, idx, None


GRADE4_GENERATORS = [
    (q_multi_mult_4, 20), (q_multi_div_4, 20), (q_fractions_equiv_4, 6), (q_fractions_add_4, 5), (q_decimals_intro_4, 7),
    (q_factors_multiples_4, 20), (q_geometry_angles_4, 10), (q_measurement_conv_4, 6), (q_word_problem_4, 4),
]


def q_fractions_unlike_5(rng):
    d1, d2 = rng.sample([2, 3, 4, 5, 6], 2)
    n1 = rng.randint(1, d1 - 1)
    n2 = rng.randint(1, d2 - 1)
    correct = Fraction(n1, d1) + Fraction(n2, d2)
    correct_str = f"{correct.numerator}/{correct.denominator}"
    distractors = set()
    tries = 0
    while len(distractors) < 3 and tries < 100:
        tries += 1
        off_n = rng.randint(-4, 4)
        val_num = correct.numerator + off_n
        if val_num <= 0 or off_n == 0:
            continue
        val = Fraction(val_num, correct.denominator)
        if val != correct:
            distractors.add(f"{val.numerator}/{val.denominator}")
    # Fallback: if the fraction's numerator was too small to yield 3 unique
    # nearby distractors (rare), pad with a different-denominator fraction.
    fallback_denom = correct.denominator + 1
    while len(distractors) < 3:
        candidate = f"{correct.numerator + len(distractors) + 1}/{fallback_denom}"
        if candidate != correct_str:
            distractors.add(candidate)
    options, idx = make_options(rng, correct_str, list(distractors))
    visual = {"type": "fraction_bars", "bars": [{"numerator": n1, "denominator": d1, "label": f"{n1}/{d1}"}, {"numerator": n2, "denominator": d2, "label": f"{n2}/{d2}"}]}
    return "Fractions", f"What is {n1}/{d1} + {n2}/{d2}?", options, idx, visual


def q_fractions_mult_5(rng):
    n1, d1 = rng.randint(1, 3), rng.randint(2, 5)
    n2, d2 = rng.randint(1, 3), rng.randint(2, 5)
    correct = Fraction(n1, d1) * Fraction(n2, d2)
    correct_str = f"{correct.numerator}/{correct.denominator}"
    distractors = {f"{n1 * n2}/{d1 + d2}", f"{n1 + n2}/{d1 * d2}", f"{correct.numerator}/{correct.denominator + 1}"}
    distractors.discard(correct_str)
    options, idx = make_options(rng, correct_str, list(distractors))
    return "Fractions", f"What is {n1}/{d1} x {n2}/{d2}?", options, idx, None


def q_decimals_ops_5(rng):
    a = round(rng.uniform(1, 20), 2)
    b = round(rng.uniform(1, 20), 2)
    op = rng.choice(["+", "-"])
    if op == "-":
        a, b = max(a, b), min(a, b)
    correct = round(a + b, 2) if op == "+" else round(a - b, 2)
    distractors = set()
    tries = 0
    while len(distractors) < 3 and tries < 100:
        tries += 1
        off = round(rng.choice([0.1, 0.2, 1, -0.1, -1, 2, -2]), 2)
        val = round(correct + off, 2)
        if val != correct and val > 0:
            distractors.add(val)
    while len(distractors) < 3:
        distractors.add(round(correct + (len(distractors) + 1) * 3.3, 2))
    options, idx = make_options(rng, correct, list(distractors))
    return "Decimals", f"What is {a} {op} {b}?", options, idx, None


def q_place_value_decimal_5(rng):
    digits = [rng.randint(0, 9) for _ in range(2)]
    n = f"{rng.randint(1, 9)}.{digits[0]}{digits[1]}"
    which = rng.choice(["tenths", "hundredths"])
    correct = digits[0] if which == "tenths" else digits[1]
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    return "Decimals", f"In the number {n}, what digit is in the {which} place?", options, idx, None


def q_volume_5(rng):
    l, w, h = rng.randint(2, 8), rng.randint(2, 8), rng.randint(2, 8)
    correct = l * w * h
    distractors = numeric_distractors(rng, correct, spread=(l, w, h, 1), min_val=1)
    options, idx = make_options(rng, correct, distractors)
    return "Volume", f"What is the volume of a box with length {l}, width {w}, and height {h}?", options, idx, None


def q_order_ops_5(rng):
    a, b, c = rng.randint(1, 9), rng.randint(1, 9), rng.randint(1, 9)
    correct = a + b * c
    distractors = {(a + b) * c, a + b + c, a * b + c}
    distractors.discard(correct)
    options, idx = make_options(rng, correct, list(distractors))
    visual = {"type": "expression_steps", "expression": f"{a} + {b} x {c}", "highlight": f"{b} x {c}"}
    return "Order of Operations", f"What is {a} + {b} x {c}?", options, idx, visual


def q_coordinate_5(rng):
    x, y = rng.randint(0, 10), rng.randint(0, 10)
    correct = f"({x}, {y})"
    distractors = [f"({y}, {x})", f"({x+1}, {y})", f"({x}, {y+1})"]
    options, idx = make_options(rng, correct, distractors)
    return "Coordinate Plane", f"A point is {x} units right and {y} units up from the origin. What are its coordinates?", options, idx, None


def q_classify_shapes_5(rng):
    shapes = [
        ("Rhombus", "4 equal sides but no right angles"),
        ("Square", "4 equal sides and 4 right angles"),
        ("Trapezoid", "exactly one pair of parallel sides"),
        ("Parallelogram", "two pairs of parallel sides but no right angles"),
        ("Kite", "two pairs of adjacent equal sides"),
    ]
    name, hint = rng.choice(shapes)
    others = rng.sample([s[0] for s in shapes if s[0] != name], 3)
    options = [name] + others
    rng.shuffle(options)
    idx = options.index(name)
    return "Geometry", f"Which quadrilateral has {hint}?", options, idx, None


def q_word_problem_5(rng):
    total = rng.randint(50, 200)
    parts = rng.choice([4, 5, 8])
    while total % parts != 0:
        total += 1
    per_part = total // parts
    distractors = numeric_distractors(rng, per_part, spread=(1, 2, parts), min_val=1)
    options, idx = make_options(rng, per_part, distractors)
    return "Word Problem", f"A charity raised ${total} split equally among {parts} local schools. How much did each school receive?", options, idx, None


GRADE5_GENERATORS = [
    (q_fractions_unlike_5, 7), (q_fractions_mult_5, 6), (q_decimals_ops_5, 10), (q_place_value_decimal_5, 6),
    (q_volume_5, 14), (q_order_ops_5, 20), (q_coordinate_5, 10), (q_classify_shapes_5, 10), (q_word_problem_5, 5),
]


def q_ratios_6(rng):
    a, b = rng.randint(2, 6), rng.randint(2, 6)
    while a == b:
        b = rng.randint(2, 6)
    mult = rng.randint(2, 5)
    correct = a * mult
    given = b * mult
    distractors = numeric_distractors(rng, correct, spread=(1, 2, a), min_val=1)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "ratio_blocks", "ratioA": a, "ratioB": b, "labelA": "flour", "labelB": "sugar", "multiplier": mult}
    return "Ratios", f"A recipe uses {a} cups of flour for every {b} cups of sugar. How many cups of flour are needed for {given} cups of sugar?", options, idx, visual


def q_percentages_6(rng):
    pct = rng.choice([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90])
    base = rng.choice([20, 40, 50, 60, 80, 100, 120, 150, 160, 200])
    correct = int(base * pct / 100)
    distractors = numeric_distractors(rng, correct, spread=(1, 2, max(pct // 5, 1)), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "percent_grid", "shaded": min(pct, 100), "label": f"{pct}% shaded"}
    return "Percentages", f"What is {pct}% of {base}?", options, idx, visual


def q_negative_numbers_6(rng):
    a = rng.randint(-15, -1)
    b = rng.randint(1, 20)
    correct = a + b
    distractors = numeric_distractors(rng, correct, spread=(1, 2, 5), min_val=None)
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "number_line", "min": -20, "max": 20, "step": 5, "marks": [{"value": a, "label": str(a)}], "jump": {"from": a, "to": correct, "label": f"+{b}"}}
    return "Negative Numbers", f"What is {a} + {b}?", options, idx, visual


def q_expressions_6(rng):
    c1, c2, const = rng.randint(2, 9), rng.randint(1, 8), rng.randint(1, 10)
    total_coeff = c1 + c2
    sign = rng.choice(["-", "+"])
    correct = f"{total_coeff}x {sign} {const}"
    distractors = [f"{total_coeff + 1}x {sign} {const}", f"{total_coeff}x {sign} {const + 1}", f"{c1 * c2}x {sign} {const}"]
    options, idx = make_options(rng, correct, distractors)
    visual = {"type": "algebra_tiles", "terms": [{"coeff": c1, "isConstant": False}, {"coeff": c2, "isConstant": False}, {"coeff": -const if sign == "-" else const, "isConstant": True}]}
    return "Algebraic Expressions", f"Simplify: {c1}x + {c2}x {sign} {const}", options, idx, visual


def q_area_triangle_6(rng):
    base, height = rng.randint(4, 16), rng.randint(3, 14)
    tries = 0
    while (base * height) % 2 != 0 and tries < 30:
        height = rng.randint(3, 14)
        tries += 1
    if (base * height) % 2 != 0:
        height += 1  # guarantees an even product
    correct = int(base * height / 2)
    distractors = numeric_distractors(rng, correct, spread=(base, height, 1), min_val=1)
    options, idx = make_options(rng, correct, distractors)
    return "Area", f"What is the area of a triangle with base {base} and height {height}?", options, idx, None


def q_volume_6(rng):
    s = rng.randint(2, 15)
    correct = s ** 3
    distractors = numeric_distractors(rng, correct, spread=(s, max(s * s // 2, 1), 1), min_val=1)
    options, idx = make_options(rng, correct, distractors)
    return "Volume", f"What is the volume of a cube with side length {s}?", options, idx, None


def q_statistics_6(rng):
    data = sorted(rng.randint(1, 20) for _ in range(5))
    stat = rng.choice(["mean", "median"])
    if stat == "mean":
        correct = round(sum(data) / len(data), 1)
    else:
        correct = data[2]
    distractors = numeric_distractors(rng, correct, spread=(1, 2), min_val=0)
    options, idx = make_options(rng, correct, distractors)
    return "Statistics", f"What is the {stat} of this data set: {', '.join(map(str, data))}?", options, idx, None


def q_coordinate_6(rng):
    x = rng.choice([i for i in range(-10, 11) if i != 0])
    y = rng.choice([i for i in range(-10, 11) if i != 0])
    quadrant_map = {(1, 1): "I", (-1, 1): "II", (-1, -1): "III", (1, -1): "IV"}
    correct = quadrant_map[(1 if x > 0 else -1, 1 if y > 0 else -1)]
    options = ["I", "II", "III", "IV"]
    idx = options.index(correct)
    return "Coordinate Plane", f"Which quadrant is the point ({x}, {y}) in?", options, idx, None


def q_dividing_fractions_6(rng):
    n1, d1 = rng.randint(1, 5), rng.randint(2, 6)
    n2, d2 = rng.randint(1, 5), rng.randint(2, 6)
    correct = Fraction(n1, d1) / Fraction(n2, d2)
    correct_str = f"{correct.numerator}/{correct.denominator}"
    distractors = {f"{n1 * n2}/{d1 * d2}", f"{correct.numerator + 1}/{correct.denominator}", f"{correct.numerator}/{correct.denominator + 1}"}
    distractors.discard(correct_str)
    options, idx = make_options(rng, correct_str, list(distractors))
    return "Dividing Fractions", f"What is {n1}/{d1} divided by {n2}/{d2}?", options, idx, None


GRADE6_GENERATORS = [
    (q_ratios_6, 20), (q_percentages_6, 20), (q_negative_numbers_6, 20), (q_expressions_6, 20), (q_area_triangle_6, 20),
    (q_volume_6, 8), (q_statistics_6, 20), (q_coordinate_6, 10), (q_dividing_fractions_6, 20),
]

GRADE_GENERATORS = {
    0: KINDERGARTEN_GENERATORS,
    1: GRADE1_GENERATORS,
    2: GRADE2_GENERATORS,
    3: GRADE3_GENERATORS,
    4: GRADE4_GENERATORS,
    5: GRADE5_GENERATORS,
    6: GRADE6_GENERATORS,
}


def build_all(seed=42):
    rng = random.Random(seed)
    questions = []
    qid = 1
    for grade, gens in GRADE_GENERATORS.items():
        seen_for_grade = set()
        for gen_fn, count in gens:
            made = 0
            attempts = 0
            while made < count and attempts < count * 30:
                attempts += 1
                topic, question, options, correct_idx, visual = gen_fn(rng)
                assert len(options) == 4, f"{topic} produced {len(options)} options: {options}"
                assert len(set(options)) == 4, f"{topic} produced duplicate options: {options}"
                assert 0 <= correct_idx < 4
                key = (topic, question, tuple(options))
                if key in seen_for_grade:
                    continue
                seen_for_grade.add(key)
                questions.append({
                    "id": qid,
                    "grade": grade,
                    "topic": topic,
                    "question": question,
                    "options": options,
                    "correct_index": correct_idx,
                    "visual": visual,
                })
                qid += 1
                made += 1
            if made < count:
                sys.stderr.write(f"WARNING: grade {grade} {gen_fn.__name__} only produced {made}/{count} unique questions\n")
    return questions


if __name__ == "__main__":
    seed = int(sys.argv[sys.argv.index("--seed") + 1]) if "--seed" in sys.argv else 42
    qs = build_all(seed)

    from collections import Counter
    by_grade = Counter(q["grade"] for q in qs)
    sys.stderr.write(f"Total questions: {len(qs)}\n")
    for g in sorted(by_grade):
        sys.stderr.write(f"  grade {g}: {by_grade[g]}\n")

    print("SEED_QUESTIONS = [")
    for q in qs:
        print("    " + repr(q) + ",")
    print("]")
