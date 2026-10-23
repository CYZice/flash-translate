"use strict";

function validPoint(point) {
  return Boolean(
    point &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x !== -99_999 &&
      point.y !== -99_999
  );
}

function getSelectionAnchor(selection) {
  if (
    !selection ||
    typeof selection.text !== "string" ||
    !selection.text.trim()
  ) {
    return null;
  }
  return [selection.mousePosEnd, selection.endBottom].find(validPoint) || null;
}

function contains(rect, point) {
  return Boolean(
    rect &&
      validPoint(point) &&
      point.x >= rect.x &&
      point.x < rect.x + rect.width &&
      point.y >= rect.y &&
      point.y < rect.y + rect.height
  );
}

function getDismissal({
  type,
  point,
  key,
  toolbar,
  result,
  resultPinned = false,
  resultFocused = false,
}) {
  if (type === "key") {
    return {
      toolbar: true,
      result: key === "Escape" || !(resultPinned || resultFocused),
    };
  }
  return {
    toolbar: type === "wheel" || !contains(toolbar, point),
    result: !(resultPinned || contains(result, point)),
  };
}

function placeFloatingWindow(point, size, workArea) {
  const x = Math.min(
    Math.max(workArea.x + 8, point.x + 8),
    workArea.x + workArea.width - size.width - 8
  );
  const below = point.y + 10;
  const y =
    below + size.height <= workArea.y + workArea.height - 8
      ? below
      : point.y - size.height - 10;
  return { x: Math.round(x), y: Math.round(Math.max(workArea.y + 8, y)) };
}

module.exports = { getSelectionAnchor, getDismissal, placeFloatingWindow };
