/**
 * Clawdroid accessibility tree parser.
 * Consumes Android UI hierarchy XML and yields interactive nodes with bounds, state, and suggested action.
 * Relevance scoring uses Clawdroid weights; compact output is used for LLM context.
 */

import { XMLParser } from "fast-xml-parser";

export interface UIElement {
  id: string;
  text: string;
  type: string;
  bounds: string;
  center: [number, number];
  size: [number, number];
  clickable: boolean;
  editable: boolean;
  enabled: boolean;
  checked: boolean;
  focused: boolean;
  selected: boolean;
  scrollable: boolean;
  longClickable: boolean;
  password: boolean;
  hint: string;
  action: "tap" | "type" | "longpress" | "scroll" | "read";
  parent: string;
  depth: number;
}

const TOLERANCE_PX = 5;

function parseBounds(boundsStr: string): { center: [number, number]; size: [number, number] } | null {
  const parts = boundsStr.replace("][", ",").replace("[", "").replace("]", "").split(",").map(Number);
  if (parts.length !== 4) return null;
  const [x1, y1, x2, y2] = parts;
  const w = x2 - x1;
  const h = y2 - y1;
  if (w <= 0 || h <= 0) return null;
  return {
    center: [Math.floor((x1 + x2) / 2), Math.floor((y1 + y2) / 2)],
    size: [w, h],
  };
}

function nodeLabelFromAttrs(text: string, desc: string, resourceId: string, typeName: string): string {
  return text || desc || (resourceId.split("/").pop() ?? "") || typeName;
}

/** Stable fingerprint of a node list for change detection. */
export function computeScreenHash(elements: UIElement[]): string {
  return elements
    .map((e) => `${e.id}|${e.text}|${e.center[0]},${e.center[1]}|${e.enabled}|${e.checked}`)
    .join(";");
}

/** Parse hierarchy XML and collect interactive nodes with state and hierarchy. */
export function getInteractiveElements(xmlContent: string): UIElement[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
  });

  let root: unknown;
  try {
    root = parser.parse(xmlContent);
  } catch {
    console.log("Warning: Accessibility XML parse failed; screen may still be loading.");
    return [];
  }

  const out: UIElement[] = [];

  function visitNode(n: any, parentCtx: string, d: number): void {
    if (!n || typeof n !== "object") return;

    const rawBounds = n["@_bounds"];
    if (rawBounds) {
      const click = n["@_clickable"] === "true";
      const longClick = n["@_long-clickable"] === "true";
      const scroll = n["@_scrollable"] === "true";
      const enabled = n["@_enabled"] !== "false";
      const checked = n["@_checked"] === "true";
      const focused = n["@_focused"] === "true";
      const selected = n["@_selected"] === "true";
      const pwd = n["@_password"] === "true";
      const cls = (n["@_class"] ?? "") as string;
      const editable =
        cls.includes("EditText") ||
        cls.includes("AutoCompleteTextView") ||
        n["@_editable"] === "true";
      const text = (n["@_text"] ?? "") as string;
      const desc = (n["@_content-desc"] ?? "") as string;
      const rid = (n["@_resource-id"] ?? "") as string;
      const hint = (n["@_hint"] ?? "") as string;
      const typeName = cls.split(".").pop() ?? "";
      const label = nodeLabelFromAttrs(text, desc, rid, typeName);
      const interactive = click || editable || longClick || scroll;
      const hasContent = !!(text || desc);

      if (interactive || hasContent) {
        const parsed = parseBounds(rawBounds);
        if (parsed) {
          let action: UIElement["action"];
          if (editable) action = "type";
          else if (longClick && !click) action = "longpress";
          else if (scroll && !click) action = "scroll";
          else if (click) action = "tap";
          else action = "read";

          out.push({
            id: rid,
            text: text || desc,
            type: typeName,
            bounds: rawBounds,
            center: parsed.center,
            size: parsed.size,
            clickable: click,
            editable,
            enabled,
            checked,
            focused,
            selected,
            scrollable: scroll,
            longClickable: longClick,
            password: pwd,
            hint,
            action,
            parent: parentCtx,
            depth: d,
          });
        }
      }
      visitChildren(n, label, d + 1);
      return;
    }
    visitChildren(n, parentCtx, d);
  }

  function visitChildren(n: any, parentCtx: string, d: number): void {
    if (n.node) {
      const list = Array.isArray(n.node) ? n.node : [n.node];
      for (const c of list) visitNode(c, parentCtx, d);
    }
    if (n.hierarchy) visitNode(n.hierarchy, parentCtx, d);
  }

  visitNode(root, "root", 0);
  return out;
}

// --- Compact representation for LLM ---

export interface CompactUIElement {
  text: string;
  center: [number, number];
  action: UIElement["action"];
  enabled?: false;
  checked?: true;
  focused?: true;
  hint?: string;
  editable?: true;
  scrollable?: true;
}

/** Reduce a full node to compact form; omit defaults to save tokens. */
export function compactElement(el: UIElement): CompactUIElement {
  const c: CompactUIElement = { text: el.text, center: el.center, action: el.action };
  if (!el.enabled) c.enabled = false;
  if (el.checked) c.checked = true;
  if (el.focused) c.focused = true;
  if (el.hint) c.hint = el.hint;
  if (el.editable) c.editable = true;
  if (el.scrollable) c.scrollable = true;
  return c;
}

const RELEVANCE = { enabled: 10, editable: 8, focused: 6, actionable: 5, hasText: 3 } as const;

function relevanceScore(el: UIElement): number {
  let s = 0;
  if (el.enabled) s += RELEVANCE.enabled;
  if (el.editable) s += RELEVANCE.editable;
  if (el.focused) s += RELEVANCE.focused;
  if (el.clickable || el.longClickable) s += RELEVANCE.actionable;
  if (el.text) s += RELEVANCE.hasText;
  return s;
}

/** Dedupe by center (within tolerance), rank by relevance, return top N as compact nodes. */
export function filterElements(
  elements: UIElement[],
  limit: number
): CompactUIElement[] {
  const byCell = new Map<string, UIElement>();
  for (const el of elements) {
    const gx = Math.round(el.center[0] / TOLERANCE_PX) * TOLERANCE_PX;
    const gy = Math.round(el.center[1] / TOLERANCE_PX) * TOLERANCE_PX;
    const k = `${gx},${gy}`;
    const cur = byCell.get(k);
    if (!cur || relevanceScore(el) > relevanceScore(cur)) byCell.set(k, el);
  }
  const list = Array.from(byCell.values());
  list.sort((a, b) => relevanceScore(b) - relevanceScore(a));
  return list.slice(0, limit).map(compactElement);
}
