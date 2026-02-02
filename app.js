// Simple diagram canvas for ER, UML & other diagrams

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const diagramTypeSelect = document.getElementById("diagramType");
const toolButtonsContainer = document.getElementById("toolButtons");
const hintText = document.getElementById("hintText");

const undoBtn = document.getElementById("undoAction");
const clearBtn = document.getElementById("clearCanvas");
const downloadBtn = document.getElementById("downloadPng");

const erdGenContainer = document.getElementById("erdGenerator");
const erdSpecInput = document.getElementById("erdSpec");
const erdGenerateBtn = document.getElementById("generateErd");

const erdFormContainer = document.getElementById("erdFormBuilder");
const erdEntityNameInput = document.getElementById("erdEntityName");
const erdEntityAttrsInput = document.getElementById("erdEntityAttributes");
const erdAddEntityBtn = document.getElementById("erdAddEntity");
const erdEntityList = document.getElementById("erdEntityList");
const erdRelNameInput = document.getElementById("erdRelName");
const erdRelEntity1Select = document.getElementById("erdRelEntity1");
const erdRelCard1Select = document.getElementById("erdRelCard1");
const erdRelEntity2Select = document.getElementById("erdRelEntity2");
const erdRelCard2Select = document.getElementById("erdRelCard2");
const erdAddRelBtn = document.getElementById("erdAddRelationship");
const erdRelList = document.getElementById("erdRelationshipList");
const erdGenerateFromFormBtn = document.getElementById(
  "generateErdFromForm"
);

// --- State ---

const toolsPerDiagram = {
  er: {
    label: "ER Diagram",
    tools: [
      { id: "select", label: "Select / Move" },
      { id: "entity", label: "Entity (Rectangle)" },
      { id: "attribute", label: "Attribute (Oval)" },
      { id: "relationship", label: "Relationship (Diamond)" },
      { id: "line", label: "Line" },
      { id: "connector", label: "Connect Shapes" },
      { id: "text", label: "Text" },
    ],
    hint:
      "Use rectangles for entities, ovals for attributes, diamonds for relationships. Add cardinalities as text near lines.",
  },
  usecase: {
    label: "Use Case",
    tools: [
      { id: "select", label: "Select / Move" },
      { id: "actor", label: "Actor" },
      { id: "usecase", label: "Use Case (Oval)" },
      { id: "boundary", label: "System Boundary" },
      { id: "line", label: "Association Line" },
      { id: "connector", label: "Connect Shapes" },
      { id: "text", label: "Text" },
    ],
    hint:
      "Place actors outside the boundary, use ovals for use cases. Connect actors to use cases with simple lines.",
  },
  class: {
    label: "Class",
    tools: [
      { id: "select", label: "Select / Move" },
      { id: "class", label: "Class Box" },
      { id: "aggregation", label: "Aggregation Line" },
      { id: "association", label: "Association Line" },
      { id: "connector", label: "Connect Shapes" },
      { id: "text", label: "Text" },
    ],
    hint:
      "Use rectangles split into three compartments for class name, attributes, and methods. Add multiplicities as text.",
  },
  object: {
    label: "Object",
    tools: [
      { id: "select", label: "Select / Move" },
      { id: "object", label: "Object Box" },
      { id: "line", label: "Link Line" },
      { id: "connector", label: "Connect Shapes" },
      { id: "text", label: "Text" },
    ],
    hint:
      "Use boxes with 'ClassName:ObjectName' and concrete values. Links between objects are plain lines.",
  },
  sequence: {
    label: "Sequence",
    tools: [
      { id: "select", label: "Select / Move" },
      { id: "lifeline", label: "Lifeline" },
      { id: "message", label: "Message Arrow" },
      { id: "connector", label: "Connect Shapes" },
      { id: "text", label: "Text" },
    ],
    hint:
      "Arrange lifelines horizontally. Draw messages from left to right with arrows, time flows top to bottom.",
  },
  activity: {
    label: "Activity",
    tools: [
      { id: "select", label: "Select / Move" },
      { id: "start", label: "Start Node" },
      { id: "end", label: "End Node" },
      { id: "activity", label: "Activity" },
      { id: "decision", label: "Decision" },
      { id: "line", label: "Flow Arrow" },
      { id: "connector", label: "Connect Shapes" },
      { id: "text", label: "Text" },
    ],
    hint:
      "Begin with a filled circle, then activities and decisions. End with a double circle.",
  },
};

let shapes = [];
let currentTool = null;
let drawing = false;
let startX = 0;
let startY = 0;
let nextShapeId = 1;
let connectionStartShape = null;
let highlightedShapeId = null;
let history = [];
const MAX_HISTORY = 50;
let erFormEntities = [];
let erFormRelationships = [];
let dragShape = null;
let dragStartMouseX = 0;
let dragStartMouseY = 0;
let dragStartShapeX = 0;
let dragStartShapeY = 0;
let dragGroupShapes = null;
let dragGroupStart = null;

// --- Utility ---

function snapshotState() {
  return {
    shapes: shapes.map((s) => ({ ...s })),
    nextShapeId,
  };
}

function pushHistory() {
  history.push(snapshotState());
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
}

function setHint(text) {
  hintText.textContent = text;
}

function setTool(toolId) {
  currentTool = toolId;
  for (const btn of toolButtonsContainer.querySelectorAll(".tool-button")) {
    btn.classList.toggle("active", btn.dataset.tool === toolId);
  }
}

function renderToolbar() {
  const type = diagramTypeSelect.value;
  const config = toolsPerDiagram[type];
  toolButtonsContainer.innerHTML = "";

  config.tools.forEach((tool, index) => {
    const btn = document.createElement("button");
    btn.className = "tool-button";
    btn.textContent = tool.label;
    btn.dataset.tool = tool.id;
    btn.addEventListener("click", () => setTool(tool.id));
    toolButtonsContainer.appendChild(btn);
    if (index === 0) {
      setTool(tool.id);
    }
  });

  setHint(config.hint);

  if (erdGenContainer) {
    erdGenContainer.style.display = type === "er" ? "block" : "none";
  }
  if (erdFormContainer) {
    erdFormContainer.style.display = type === "er" ? "block" : "none";
  }
}

// --- Drawing primitives ---

function drawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const idMap = {};
  for (const s of shapes) {
    if (s.id != null) idMap[s.id] = s;
  }

  for (const s of shapes) {
    if (s.fromId != null && s.toId != null) {
      const from = idMap[s.fromId];
      const to = idMap[s.toId];
      if (from && to) {
        const { start, end } = getConnectionEndpoints(from, to);
        s.x1 = start.x;
        s.y1 = start.y;
        s.x2 = end.x;
        s.y2 = end.y;
      }
    }

    const selected = s.id === highlightedShapeId;
    switch (s.kind) {
      case "rect":
        drawRectShape(s, selected);
        break;
      case "oval":
        drawOvalShape(s, selected);
        break;
      case "diamond":
        drawDiamondShape(s, selected);
        break;
      case "line":
        drawLineShape(s, selected);
        break;
      case "arrow":
        drawArrowShape(s, selected);
        break;
      case "actor":
        drawActorShape(s, selected);
        break;
      case "boundary":
        drawBoundaryShape(s, selected);
        break;
      case "class":
        drawClassShape(s, selected);
        break;
      case "lifeline":
        drawLifelineShape(s, selected);
        break;
      case "start":
        drawStartShape(s, selected);
        break;
      case "end":
        drawEndShape(s, selected);
        break;
      case "decision":
        drawDecisionShape(s, selected);
        break;
      case "text":
        drawTextShape(s, selected);
        break;
      default:
        break;
    }
  }
}

function drawRectShape(s, selected) {
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(s.x, s.y, s.w, s.h);
  if (s.label) {
    ctx.fillStyle = "#000000";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.label, s.x + s.w / 2, s.y + s.h / 2);
  }
  if (selected) {
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.strokeRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6);
  }
  ctx.restore();
}

function drawOvalShape(s, selected) {
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const rx = Math.abs(s.w) / 2;
  const ry = Math.abs(s.h) / 2;
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (s.label) {
    ctx.fillStyle = "#000000";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.label, cx, cy);
    if (s.isPk) {
      ctx.beginPath();
      const metrics = ctx.measureText(s.label);
      const ux1 = cx - metrics.width / 2;
      const ux2 = cx + metrics.width / 2;
      const uy = cy + 10;
      ctx.moveTo(ux1, uy);
      ctx.lineTo(ux2, uy);
      ctx.stroke();
    }
  }
  if (selected) {
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.strokeRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6);
  }
  ctx.restore();
}

function drawDiamondShape(s, selected) {
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  ctx.beginPath();
  ctx.moveTo(cx, s.y);
  ctx.lineTo(s.x + s.w, cy);
  ctx.lineTo(cx, s.y + s.h);
  ctx.lineTo(s.x, cy);
  ctx.closePath();
  ctx.stroke();
  if (s.label) {
    ctx.fillStyle = "#000000";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.label, cx, cy);
  }
  if (selected) {
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.strokeRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6);
  }
  ctx.restore();
}

function drawLineShape(s, selected) {
  ctx.save();
  ctx.strokeStyle = selected ? "#2563eb" : "#000000";
  ctx.lineWidth = selected ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(s.x1, s.y1);
  ctx.lineTo(s.x2, s.y2);
  ctx.stroke();
  ctx.restore();
}

function drawArrowShape(s, selected) {
  ctx.save();
  ctx.strokeStyle = selected ? "#2563eb" : "#000000";
  ctx.lineWidth = selected ? 3 : 2;
  const { x1, y1, x2, y2 } = s;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - size * Math.cos(angle - Math.PI / 6),
    y2 - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - size * Math.cos(angle + Math.PI / 6),
    y2 - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = "#000000";
  ctx.fill();
  ctx.restore();
}

function drawActorShape(s, selected) {
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  const { x, y } = s;
  // head
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.lineTo(x, y + 40);
  // arms
  ctx.moveTo(x - 15, y + 20);
  ctx.lineTo(x + 15, y + 20);
  // legs
  ctx.moveTo(x, y + 40);
  ctx.lineTo(x - 15, y + 60);
  ctx.moveTo(x, y + 40);
  ctx.lineTo(x + 15, y + 60);
  ctx.stroke();
  if (selected) {
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 20, y - 20, 40, 90);
  }
  ctx.restore();
}

function drawBoundaryShape(s, selected) {
  drawRectShape(s, selected);
}

function drawClassShape(s, selected) {
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(s.x, s.y, s.w, s.h);
  const line1 = s.y + s.h / 3;
  const line2 = s.y + (2 * s.h) / 3;
  ctx.beginPath();
  ctx.moveTo(s.x, line1);
  ctx.lineTo(s.x + s.w, line1);
  ctx.moveTo(s.x, line2);
  ctx.lineTo(s.x + s.w, line2);
  ctx.stroke();
  if (s.label) {
    ctx.fillStyle = "#000000";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.label, s.x + s.w / 2, s.y + (s.h / 3) / 2);
  }
  if (selected) {
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.strokeRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6);
  }
  ctx.restore();
}

function drawLifelineShape(s, selected) {
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  // head box
  ctx.strokeRect(s.x - 40, s.y, 80, 30);
  // lifeline
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(s.x, s.y + 30);
  ctx.lineTo(s.x, s.y + s.length);
  ctx.stroke();
  if (selected) {
    ctx.setLineDash([]);
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x - 45, s.y - 5, 90, 40);
  }
  ctx.restore();
}

function drawStartShape(s, selected) {
  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x - 12, s.y - 12, 24, 24);
  }
  ctx.restore();
}

function drawEndShape(s, selected) {
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#000000";
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x - 14, s.y - 14, 28, 28);
  }
  ctx.restore();
}

function drawDecisionShape(s, selected) {
  drawDiamondShape(s, selected);
}

function drawTextShape(s) {
  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.font = "14px system-ui";
  ctx.textBaseline = "top";
  ctx.fillText(s.text || "label", s.x, s.y);
  ctx.restore();
}

// --- Mouse handling ---

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;

  if (currentTool === "select") {
    const target = hitTestShape(startX, startY);
    if (target) {
      pushHistory();
      dragShape = target;
      dragStartMouseX = startX;
      dragStartMouseY = startY;
      dragStartShapeX = target.x;
      dragStartShapeY = target.y;
      dragGroupShapes = null;
      dragGroupStart = null;
      if (target.groupId != null) {
        dragGroupShapes = shapes.filter(
          (s) => s.groupId === target.groupId
        );
        dragGroupStart = new Map();
        dragGroupShapes.forEach((s) => {
          dragGroupStart.set(s.id, {
            x: s.x,
            y: s.y,
            x1: s.x1,
            y1: s.y1,
            x2: s.x2,
            y2: s.y2,
          });
        });
      }
      highlightedShapeId = target.id || null;
      drawAll();
    } else {
      dragShape = null;
      highlightedShapeId = null;
      drawAll();
    }
    return;
  }

  if (currentTool === "connector") {
    const target = hitTestShape(startX, startY);
    if (target) {
      handleConnectionClick(target);
    } else {
      connectionStartShape = null;
      highlightedShapeId = null;
      drawAll();
    }
    return;
  }

  drawing = true;

  if (
    ["actor", "lifeline", "start", "end", "text"].includes(currentTool)
  ) {
    createInstantShape(startX, startY);
    drawing = false;
    drawAll();
  }
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (dragShape) {
    const dx = x - dragStartMouseX;
    const dy = y - dragStartMouseY;
    if (dragGroupShapes && dragGroupStart) {
      dragGroupShapes.forEach((s) => {
        const startPos = dragGroupStart.get(s.id);
        if (!startPos) return;
        if (typeof startPos.x === "number" && typeof startPos.y === "number") {
          s.x = startPos.x + dx;
          s.y = startPos.y + dy;
        }
        if (
          typeof startPos.x1 === "number" &&
          typeof startPos.y1 === "number" &&
          typeof startPos.x2 === "number" &&
          typeof startPos.y2 === "number"
        ) {
          s.x1 = startPos.x1 + dx;
          s.y1 = startPos.y1 + dy;
          s.x2 = startPos.x2 + dx;
          s.y2 = startPos.y2 + dy;
        }
      });
    } else {
      switch (dragShape.kind) {
        case "rect":
        case "boundary":
        case "class":
        case "oval":
        case "diamond":
        case "actor":
        case "lifeline":
        case "start":
        case "end":
        case "text":
          dragShape.x = dragStartShapeX + dx;
          dragShape.y = dragStartShapeY + dy;
          break;
        default:
          break;
      }
    }
    drawAll();
    return;
  }

  if (!drawing) return;

  // Preview not persistent: just redraw all and overlay preview
  drawAll();
  drawPreview(startX, startY, x, y);
});

canvas.addEventListener("mouseup", (e) => {
  if (dragShape) {
    dragShape = null;
    dragGroupShapes = null;
    dragGroupStart = null;
    return;
  }
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  const endX = e.clientX - rect.left;
  const endY = e.clientY - rect.top;
  drawing = false;

  createShapeFromDrag(startX, startY, endX, endY);
  drawAll();
});

canvas.addEventListener("mouseleave", () => {
  if (dragShape) {
    dragShape = null;
    return;
  }
  if (drawing) {
    drawing = false;
    drawAll();
  }
});

canvas.addEventListener("dblclick", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const shape = hitTestShape(x, y);
  if (!shape) return;

  if (["rect", "boundary", "class", "oval", "diamond"].includes(shape.kind)) {
    const current = shape.label || "";
    const text = prompt("Enter label text:", current);
    if (!text) return;
    pushHistory();
    applyLabelWithPadding(shape, text);
    drawAll();
  }
});

function applyLabelWithPadding(shape, text) {
  ctx.save();
  ctx.font = "14px system-ui";
  const metrics = ctx.measureText(text);
  const paddingX = 24;
  const paddingY = 16;
  const targetWidth = metrics.width + paddingX * 2;
  const baseMin = shape.kind === "class" ? 90 : 40;
  const targetHeight = Math.max(baseMin, paddingY * 2);
  const centerX = shape.x + shape.w / 2;
  const centerY = shape.y + shape.h / 2;

  shape.w = targetWidth;
  shape.h = targetHeight;
  shape.x = centerX - shape.w / 2;
  shape.y = centerY - shape.h / 2;
  shape.label = text;
  ctx.restore();
}

function drawPreview(x1, y1, x2, y2) {
  const w = x2 - x1;
  const h = y2 - y1;
  const temp = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(w), h: Math.abs(h) };
  const line = { x1, y1, x2, y2 };

  switch (currentTool) {
    case "entity":
    case "boundary":
    case "class":
    case "object":
    case "activity":
      drawRectShape(temp);
      if (currentTool === "class") {
        drawClassShape(temp);
      }
      break;
    case "attribute":
    case "usecase":
      drawOvalShape(temp);
      break;
    case "relationship":
    case "decision":
      drawDiamondShape(temp);
      break;
    case "line":
    case "association":
    case "aggregation":
      drawLineShape(line);
      break;
    case "message":
      drawArrowShape(line);
      break;
    default:
      break;
  }
}

// --- ERD generator ---

function generateErdFromSpec(rawText) {
  const lines = rawText.split(/\r?\n/);
  const entities = [];
  const entityByName = new Map();
  const relationships = [];

  let currentEntity = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const entityMatch = /^Entity\s+([A-Za-z_][\w]*)/i.exec(trimmed);
    if (entityMatch) {
      currentEntity = {
        name: entityMatch[1],
        attributes: [],
      };
      entities.push(currentEntity);
      entityByName.set(currentEntity.name, currentEntity);
      continue;
    }

    const relMatch =
      /^Relationship\s+([A-Za-z_][\w]*)\s+([A-Za-z_][\w]*)\.(\w+)\s+([A-Za-z_][\w]*)\.(\w+)/i.exec(
        trimmed
      );
    if (relMatch) {
      relationships.push({
        name: relMatch[1],
        e1: relMatch[2],
        card1: relMatch[3],
        e2: relMatch[4],
        card2: relMatch[5],
      });
      currentEntity = null;
      continue;
    }

    if (currentEntity) {
      const isPk = trimmed.startsWith("*");
      const attrMatch = /^[-*]?\s*([A-Za-z_][\w]*)/.exec(trimmed);
      if (!attrMatch) continue;
      currentEntity.attributes.push({
        name: attrMatch[1],
        isPk,
      });
    }
  }

  pushHistory();
  buildErdDiagram(entities, relationships);
}

function buildErdDiagram(entities, relationships) {
  shapes = [];
  connectionStartShape = null;
  highlightedShapeId = null;

  const marginX = 140;
  const marginY = 80;
  const colWidth = 320;
  // Radius for attribute ovals around the entity, similar to textbook ERDs
  const attrRadiusX = 150;
  const attrRadiusY = 90;
  // Row height chosen so attributes do not overlap rows
  const rowHeight = attrRadiusY * 2 + 140;
  const maxCols = Math.min(
    3,
    Math.max(1, Math.ceil(Math.sqrt(entities.length || 1)))
  );

  const entityRectByName = {};

  entities.forEach((entity, index) => {
    const groupId = `entity:${entity.name}`;
    const col = index % maxCols;
    const row = Math.floor(index / maxCols);
    const x = marginX + col * colWidth;
    const y = marginY + row * rowHeight;

    const rect = {
      id: nextShapeId++,
      kind: "rect",
      groupId,
      x,
      y,
      w: 160,
      h: 40,
    };
    applyLabelWithPadding(rect, entity.name);
    shapes.push(rect);
    entityRectByName[entity.name] = rect;

    const attrs = entity.attributes || [];
    const attrCount = attrs.length;
    const entityCenter = getShapeCenter(rect);

    attrs.forEach((attr, i) => {
      const angle =
        attrCount === 1
          ? -Math.PI / 2
          : -Math.PI / 2 + (i * (Math.PI * 2)) / attrCount;
      const cx = entityCenter.x + Math.cos(angle) * attrRadiusX;
      const cy = entityCenter.y + Math.sin(angle) * attrRadiusY;
      const ovalWidth = 150;
      const ovalHeight = 40;
      const oval = {
        id: nextShapeId++,
        kind: "oval",
        groupId,
        x: cx - ovalWidth / 2,
        y: cy - ovalHeight / 2,
        w: ovalWidth,
        h: ovalHeight,
        isPk: attr.isPk,
      };
      const labelText = attr.isPk ? `${attr.name} (PK)` : attr.name;
      applyLabelWithPadding(oval, labelText);
      shapes.push(oval);

      shapes.push({
        id: nextShapeId++,
        kind: "line",
        groupId,
        fromId: rect.id,
        toId: oval.id,
      });
    });
  });

  relationships.forEach((rel) => {
    const e1Rect = entityRectByName[rel.e1];
    const e2Rect = entityRectByName[rel.e2];
    if (!e1Rect || !e2Rect) return;

    const p1 = getShapeCenter(e1Rect);
    const p2 = getShapeCenter(e2Rect);
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;

    const diamond = {
      id: nextShapeId++,
      kind: "diamond",
      x: cx - 40,
      y: cy - 25,
      w: 80,
      h: 50,
    };
    applyLabelWithPadding(diamond, rel.name);
    shapes.push(diamond);

    shapes.push({
      id: nextShapeId++,
      kind: "line",
      fromId: diamond.id,
      toId: e1Rect.id,
    });
    shapes.push({
      id: nextShapeId++,
      kind: "line",
      fromId: diamond.id,
      toId: e2Rect.id,
    });

    const cd = getShapeCenter(diamond);
    const t1x = (cd.x + p1.x) / 2;
    const t1y = (cd.y + p1.y) / 2;
    const t2x = (cd.x + p2.x) / 2;
    const t2y = (cd.y + p2.y) / 2;
    shapes.push({
      id: nextShapeId++,
      kind: "text",
      x: t1x + 4,
      y: t1y - 4,
      text: rel.card1,
    });
    shapes.push({
      id: nextShapeId++,
      kind: "text",
      x: t2x + 4,
      y: t2y - 4,
      text: rel.card2,
    });
  });

  drawAll();
}

function createShapeFromDrag(x1, y1, x2, y2) {
  const w = x2 - x1;
  const h = y2 - y1;
  const box = {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(w),
    h: Math.abs(h),
  };
  const line = { x1, y1, x2, y2 };

  if (box.w < 5 && box.h < 5 && ["line", "association", "aggregation", "message"].includes(currentTool)) {
    return;
  }

  pushHistory();

  const fromShape = hitTestShape(x1, y1);
  const toShape = hitTestShape(x2, y2);
  const hasConnection =
    fromShape && toShape && fromShape.id != null && toShape.id != null && fromShape.id !== toShape.id;

  switch (currentTool) {
    case "entity":
    case "object":
    case "activity":
      shapes.push({ id: nextShapeId++, kind: "rect", ...box });
      break;
    case "boundary":
      shapes.push({ id: nextShapeId++, kind: "boundary", ...box });
      break;
    case "class":
      shapes.push({ id: nextShapeId++, kind: "class", ...box });
      break;
    case "attribute":
    case "usecase":
      shapes.push({ id: nextShapeId++, kind: "oval", ...box });
      break;
    case "relationship":
    case "decision":
      shapes.push({ id: nextShapeId++, kind: "diamond", ...box });
      break;
    case "line":
    case "association":
    case "aggregation":
      if (hasConnection) {
        shapes.push({
          id: nextShapeId++,
          kind: "line",
          fromId: fromShape.id,
          toId: toShape.id,
          ...line,
        });
      } else {
        shapes.push({ id: nextShapeId++, kind: "line", ...line });
      }
      break;
    case "message":
      if (hasConnection) {
        shapes.push({
          id: nextShapeId++,
          kind: "arrow",
          fromId: fromShape.id,
          toId: toShape.id,
          ...line,
        });
      } else {
        shapes.push({ id: nextShapeId++, kind: "arrow", ...line });
      }
      break;
    default:
      break;
  }
}

function createInstantShape(x, y) {
  switch (currentTool) {
    case "actor":
      pushHistory();
      shapes.push({ id: nextShapeId++, kind: "actor", x, y });
      break;
    case "lifeline":
      pushHistory();
      shapes.push({ id: nextShapeId++, kind: "lifeline", x, y, length: 400 });
      break;
    case "start":
      pushHistory();
      shapes.push({ id: nextShapeId++, kind: "start", x, y });
      break;
    case "end":
      pushHistory();
      shapes.push({ id: nextShapeId++, kind: "end", x, y });
      break;
    case "text": {
      const text = prompt("Enter label text:", "");
      if (text) {
        pushHistory();
        shapes.push({ id: nextShapeId++, kind: "text", x, y, text });
      }
      break;
    }
    default:
      break;
  }
}

// --- Hit testing & connectors ---

function hitTestShape(x, y) {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const s = shapes[i];
    switch (s.kind) {
      case "rect":
      case "boundary":
      case "class":
        if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
          return s;
        }
        break;
      case "oval": {
        const cx = s.x + s.w / 2;
        const cy = s.y + s.h / 2;
        const rx = s.w / 2;
        const ry = s.h / 2;
        const norm =
          ((x - cx) * (x - cx)) / (rx * rx || 1) +
          ((y - cy) * (y - cy)) / (ry * ry || 1);
        if (norm <= 1) return s;
        break;
      }
      case "diamond":
      case "decision":
        if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
          return s;
        }
        break;
      case "actor":
        if (x >= s.x - 20 && x <= s.x + 20 && y >= s.y - 20 && y <= s.y + 70) {
          return s;
        }
        break;
      case "lifeline":
        if (x >= s.x - 40 && x <= s.x + 40 && y >= s.y && y <= s.y + 30) {
          return s;
        }
        break;
      case "start":
      case "end": {
        const dx = x - s.x;
        const dy = y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 12) return s;
        break;
      }
      case "text":
        if (x >= s.x && x <= s.x + 100 && y >= s.y && y <= s.y + 20) {
          return s;
        }
        break;
      default:
        break;
    }
  }
  return null;
}

function getShapeCenter(s) {
  switch (s.kind) {
    case "rect":
    case "boundary":
    case "class":
    case "oval":
    case "diamond":
      return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
    case "actor":
      return { x: s.x, y: s.y + 30 };
    case "lifeline":
      return { x: s.x, y: s.y + 15 };
    case "start":
    case "end":
      return { x: s.x, y: s.y };
    case "text":
      return { x: s.x + 50, y: s.y + 10 };
    default:
      return { x: 0, y: 0 };
  }
}

function getBorderPoint(shape, towards) {
  const center = getShapeCenter(shape);
  let dx = towards.x - center.x;
  let dy = towards.y - center.y;
  if (dx === 0 && dy === 0) {
    return { x: center.x, y: center.y };
  }

  switch (shape.kind) {
    case "rect":
    case "boundary":
    case "class": {
      const hw = shape.w / 2;
      const hh = shape.h / 2;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      let tx = hw / absDx;
      let ty = hh / absDy;
      let t;
      if (!isFinite(tx)) tx = Infinity;
      if (!isFinite(ty)) ty = Infinity;
      if (tx < ty) {
        t = tx;
      } else {
        t = ty;
      }
      return { x: center.x + dx * t, y: center.y + dy * t };
    }
    case "diamond": {
      // Diamond defined by |x-cx|/(w/2) + |y-cy|/(h/2) = 1
      const hw = shape.w / 2;
      const hh = shape.h / 2;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const denom =
        (absDx / (hw || 1)) + (absDy / (hh || 1));
      if (denom === 0) return { x: center.x, y: center.y };
      const t = 1 / denom;
      return { x: center.x + dx * t, y: center.y + dy * t };
    }
    case "oval": {
      const rx = shape.w / 2;
      const ry = shape.h / 2;
      const denom =
        (dx * dx) / (rx * rx || 1) + (dy * dy) / (ry * ry || 1);
      if (denom === 0) return { x: center.x, y: center.y };
      const t = 1 / Math.sqrt(denom);
      return { x: center.x + dx * t, y: center.y + dy * t };
    }
    default:
      return { x: center.x, y: center.y };
  }
}

function getConnectionEndpoints(from, to) {
  const toCenter = getShapeCenter(to);
  const fromCenter = getShapeCenter(from);
  const start = getBorderPoint(from, toCenter);
  const end = getBorderPoint(to, fromCenter);
  return { start, end };
}

function handleConnectionClick(shape) {
  if (!connectionStartShape) {
    connectionStartShape = shape;
    highlightedShapeId = shape.id;
    drawAll();
    return;
  }

  if (shape.id !== connectionStartShape.id) {
    pushHistory();
    const p1 = getShapeCenter(connectionStartShape);
    const p2 = getShapeCenter(shape);
    const currentDiagram = diagramTypeSelect.value;
    const isFlowArrow =
      currentDiagram === "activity" || currentDiagram === "sequence";
    const kind = isFlowArrow ? "arrow" : "line";
    shapes.push({
      id: nextShapeId++,
      kind,
      fromId: connectionStartShape.id,
      toId: shape.id,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
    });
  }

  connectionStartShape = null;
  highlightedShapeId = null;
  drawAll();
}

// --- Controls ---

diagramTypeSelect.addEventListener("change", () => {
  renderToolbar();
});

clearBtn.addEventListener("click", () => {
  if (confirm("Clear the canvas?")) {
    pushHistory();
    shapes = [];
    drawAll();
  }
});

downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${diagramTypeSelect.value}-diagram.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

if (undoBtn) {
  undoBtn.addEventListener("click", () => {
    if (!history.length) return;
    const prev = history.pop();
    shapes = prev.shapes || [];
    nextShapeId = prev.nextShapeId || 1;
    connectionStartShape = null;
    highlightedShapeId = null;
    drawAll();
  });
}

if (erdGenerateBtn) {
  erdGenerateBtn.addEventListener("click", () => {
    const text = (erdSpecInput && erdSpecInput.value) || "";
    if (!text.trim()) return;
    generateErdFromSpec(text);
  });
}

function refreshErdEntityUI() {
  if (!erdEntityList) return;
  erdEntityList.innerHTML = "";
  erFormEntities.forEach((e) => {
    const li = document.createElement("li");
    const attrs = e.attributes
      .map((a) => (a.isPk ? `*${a.name}` : a.name))
      .join(", ");
    li.textContent = `${e.name} — ${attrs}`;
    erdEntityList.appendChild(li);
  });

  if (erdRelEntity1Select && erdRelEntity2Select) {
    [erdRelEntity1Select, erdRelEntity2Select].forEach((sel) => {
      const prev = sel.value;
      sel.innerHTML = "";
      erFormEntities.forEach((e) => {
        const opt = document.createElement("option");
        opt.value = e.name;
        opt.textContent = e.name;
        sel.appendChild(opt);
      });
      if (prev) {
        sel.value = prev;
      }
    });
  }
}

function refreshErdRelationshipUI() {
  if (!erdRelList) return;
  erdRelList.innerHTML = "";
  erFormRelationships.forEach((r) => {
    const li = document.createElement("li");
    li.textContent = `${r.name}: ${r.e1}.${r.card1} → ${r.e2}.${r.card2}`;
    erdRelList.appendChild(li);
  });
}

if (erdAddEntityBtn) {
  erdAddEntityBtn.addEventListener("click", () => {
    const name = (erdEntityNameInput?.value || "").trim();
    const attrsRaw = (erdEntityAttrsInput?.value || "").trim();
    if (!name || !attrsRaw) return;

    const attrs = attrsRaw.split(",").map((part) => {
      const t = part.trim();
      if (!t) return null;
      const isPk = t.startsWith("*");
      const n = isPk ? t.slice(1).trim() : t;
      if (!n) return null;
      return { name: n, isPk };
    });

    const filtered = attrs.filter(Boolean);
    if (!filtered.length) return;

    erFormEntities.push({
      name,
      attributes: filtered,
    });

    if (erdEntityNameInput) erdEntityNameInput.value = "";
    if (erdEntityAttrsInput) erdEntityAttrsInput.value = "";
    refreshErdEntityUI();
  });
}

if (erdAddRelBtn) {
  erdAddRelBtn.addEventListener("click", () => {
    if (!erFormEntities.length) return;

    const name = (erdRelNameInput?.value || "").trim();
    const e1 = erdRelEntity1Select?.value || "";
    const e2 = erdRelEntity2Select?.value || "";
    const card1 = erdRelCard1Select?.value || "1";
    const card2 = erdRelCard2Select?.value || "1";

    if (!name || !e1 || !e2 || e1 === e2) return;

    erFormRelationships.push({
      name,
      e1,
      card1,
      e2,
      card2,
    });

    if (erdRelNameInput) erdRelNameInput.value = "";
    refreshErdRelationshipUI();
  });
}

if (erdGenerateFromFormBtn) {
  erdGenerateFromFormBtn.addEventListener("click", () => {
    if (!erFormEntities.length) return;
    const entities = erFormEntities.map((e) => ({
      name: e.name,
      attributes: e.attributes.map((a) => ({ ...a })),
    }));
    const relationships = erFormRelationships.map((r) => ({ ...r }));
    pushHistory();
    buildErdDiagram(entities, relationships);
  });
}

// --- Init ---

renderToolbar();
drawAll();

