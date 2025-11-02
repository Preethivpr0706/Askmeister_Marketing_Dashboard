# Brav0s Exports Chatbot - Node Flow Structure

## Main Flow Nodes

```
trigger (Start)
    ↓
sendMessage (Welcome Menu)
    ├── "🗿 View Products" → condition → sendMessage (Product Categories)
    ├── "💰 Request Quote" → condition → sendMessage (Quote Types)
    ├── "📦 Custom Orders" → condition → sendMessage (Custom Options)
    ├── "🌍 Export Info" → condition → sendMessage (Export Details)
    └── "📞 Contact Us" → condition → sendMessage (Contact Info)
```

## Product Categories Flow

```
sendMessage (Product Menu)
    ↓
waitForReply (User Selection)
    ↓
condition (Check Selection)
    ├── "Limestone" → sendMessage (Limestone Details) → waitForReply
    ├── "Wall Cladding" → sendMessage (Wall Cladding Details) → waitForReply
    ├── "Pebble Stones" → sendMessage (Pebble Details) → waitForReply
    ├── "Marble Chips" → sendMessage (Marble Chips Details) → waitForReply
    ├── "Granite Stones" → sendMessage (Granite Details) → waitForReply
    ├── "Granite Slabs" → sendMessage (Granite Slabs Details) → waitForReply
    └── "Back" → condition → sendMessage (Main Menu)
```

## Quote Request Flow

```
sendMessage (Quote Request)
    ↓
waitForReply (Quote Type)
    ↓
condition (Quote Type)
    ├── "Bulk Order" → sendMessage (Bulk Quote Form) → waitForReply (Details)
    ├── "Project Quote" → sendMessage (Project Quote Form) → waitForReply (Details)
    └── "Price List" → sendMessage (Price List Info) → waitForReply (Email)
    ↓
sendMessage (Thank You) → delay (5s) → sendMessage (Follow Up)
```

## Custom Orders Flow

```
sendMessage (Custom Orders Menu)
    ↓
waitForReply (Custom Type)
    ↓
condition (Custom Type)
    ├── "Custom Sizes" → sendMessage (Size Requirements) → waitForReply
    ├── "Custom Finishes" → sendMessage (Finish Options) → waitForReply
    ├── "Custom Specs" → sendMessage (Specification Form) → waitForReply
    └── "Bulk Requirements" → sendMessage (Bulk Order Form) → waitForReply
    ↓
sendMessage (Custom Quote) → waitForReply (Confirmation)
```

## Export Information Flow

```
sendMessage (Export Information)
    ↓
waitForReply (Export Query)
    ↓
condition (Export Type)
    ├── "Export Process" → sendMessage (Process Details)
    ├── "Shipping Rates" → sendMessage (Rate Calculator) → waitForReply
    └── "Documentation" → sendMessage (Document Requirements)
    ↓
sendMessage (Contact Sales) → waitForReply (Lead Info)
```

## Contact Information Flow

```
sendMessage (Contact Details)
    ↓
waitForReply (Contact Method)
    ↓
condition (Contact Type)
    ├── "Email" → sendMessage (Email Address) → waitForReply
    ├── "Phone" → sendMessage (Phone Number) → waitForReply
    └── "Business Hours" → sendMessage (Hours Info)
    ↓
sendMessage (Alternative Contact)
```

## Complete Node Sequence Example

Here's how you'd build the main flow in your chatbot builder:

```
1. trigger (id: start)
   - content: "Welcome to Brav0s Exports! 🏔️"

2. sendMessage (id: welcome_msg)
   - messageType: "buttons"
   - content: "We are manufacturers and exporters..."
   - buttons: [
       {title: "🗿 View Products", type: "reply"},
       {title: "💰 Request Quote", type: "reply"},
       {title: "📦 Custom Orders", type: "reply"},
       {title: "🌍 Export Info", type: "reply"},
       {title: "📞 Contact Us", type: "reply"}
     ]

3. waitForReply (id: main_choice)
   - replyType: "any"
   - timeout: 300

4. condition (id: route_main)
   - conditionType: "equals"
   - compareValue: "🗿 View Products"
   - trueLabel: "Products"
   - falseLabel: "Other"

5. sendMessage (id: products_menu)
   - messageType: "buttons"
   - content: "Select product category:"
   - buttons: [
       {title: "🏔️ Limestone", type: "reply"},
       {title: "🧱 Wall Cladding", type: "reply"},
       {title: "🪨 Pebble Stones", type: "reply"},
       {title: "💎 Marble Chips", type: "reply"},
       {title: "🗻 Granite", type: "reply"},
       {title: "🏔️ Slabs", type: "reply"},
       {title: "⬅️ Back", type: "reply"}
     ]

6. waitForReply (id: product_choice)
   - replyType: "any"
   - timeout: 300
```

## Node Configuration Templates

### Trigger Node
```
{
  "type": "trigger",
  "content": "Chatbot started"
}
```

### Send Message Node
```
{
  "type": "sendMessage",
  "messageType": "buttons",
  "content": "Your message here",
  "buttons": [
    {"title": "Option 1", "type": "reply"},
    {"title": "Option 2", "type": "reply"}
  ]
}
```

### Wait for Reply Node
```
{
  "type": "waitForReply",
  "replyType": "any",
  "timeout": 300
}
```

### Condition Node
```
{
  "type": "condition",
  "conditionType": "equals",
  "compareValue": "expected_value",
  "trueLabel": "Yes",
  "falseLabel": "No"
}
```

### Delay Node
```
{
  "type": "delay",
  "duration": 5
}
```

This node-based structure matches your existing chatbot builder system and shows exactly how to connect the nodes using React Flow!
