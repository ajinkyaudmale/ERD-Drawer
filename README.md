# ERD (Entity-Relationship Diagram) Drawer

A powerful, interactive tool for creating professional Entity-Relationship Diagrams (ERDs) directly in your browser. This application allows you to visually design database schemas with an intuitive interface.

## Features

- **Interactive ERD Creation**: Draw entities, attributes, and relationships with ease
- **Multiple Diagram Types**: Support for ER diagrams, UML class diagrams, and more
- **Real-time Preview**: See changes as you build your diagram
- **Export Options**: Save your diagrams as PNG images
- **Form-based Input**: Define entities and relationships using a user-friendly form
- **Text-based Input**: Quickly generate diagrams using a simple text syntax

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- No installation required - runs directly in the browser

### Usage

1. **Using the Visual Editor**:
   - Click on the canvas to add entities
   - Connect entities using the relationship tool
   - Double-click on elements to edit their properties

2. **Using the Form**:
   - Go to the "ERD Generator (Form)" section
   - Add entities and their attributes
   - Define relationships between entities
   - Click "Generate ERD" to create the diagram

3. **Using Text Input**:
   - Go to the "ERD Generator (Text)" section
   - Enter your entities and relationships using the simple syntax
   - Click "Generate ERD" to create the diagram

### Example Text Input
```
Entity Student
  *student_id
  name
  email
  date_of_birth

Entity Course
  *course_id
  title
  credits

Relationship Enrollment
  Student 1..* -- 1..* Course
  enrollment_date
  grade
```

## Keyboard Shortcuts

- `Delete`: Remove selected elements
- `Ctrl+Z`: Undo last action
- `Ctrl+Y`: Redo last action
- `Ctrl+S`: Save diagram
- `Esc`: Deselect all elements

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with HTML5 Canvas and vanilla JavaScript
- Inspired by professional database design tools
- Special thanks to all contributors

## Screenshot

![ERD Drawer Screenshot](screenshot.png)

---

Created with ❤️ by [Your Name]
