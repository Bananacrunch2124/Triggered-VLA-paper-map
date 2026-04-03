document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "triggered_vla_paper_map_layout_v2";
  const THEME_KEY = "triggered_vla_paper_map_theme_v1";

  const BOARD_MIN_WIDTH = 3200;
  const BOARD_MIN_HEIGHT = 2200;
  const BOARD_PADDING = 800;
  const ITEM_WIDTH = 280;
  const ITEM_HEIGHT = 180;

  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2.0;
  const ZOOM_STEP = 0.1;

  const searchInput = document.getElementById("searchInput");
  const paperList = document.getElementById("paperList");
  const paperCount = document.getElementById("paperCount");
  const boardCount = document.getElementById("boardCount");
  const board = document.getElementById("board");
  const boardCanvas = document.getElementById("boardCanvas");
  const boardItemsLayer = document.getElementById("boardItemsLayer");
  const connectionSvg = document.getElementById("connectionSvg");
  const emptyBoardHint = document.getElementById("emptyBoardHint");
  const zoomIndicator = document.getElementById("zoomIndicator");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const zoomInBtn = document.getElementById("zoomInBtn");

  const placeAllBtn = document.getElementById("placeAllBtn");
  const connectBtn = document.getElementById("connectBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const resetBtn = document.getElementById("resetBtn");
  const darkBtn = document.getElementById("darkBtn");
  const fsBtn = document.getElementById("fsBtn");
  const importFileInput = document.getElementById("importFileInput");

  const toast = document.getElementById("toast");

  const noteModal = document.getElementById("noteModal");
  const noteModalTitle = document.getElementById("noteModalTitle");
  const noteTitleInput = document.getElementById("noteTitleInput");
  const noteTextInput = document.getElementById("noteTextInput");
  const saveNoteBtn = document.getElementById("saveNoteBtn");
  const deleteNoteBtn = document.getElementById("deleteNoteBtn");
  const closeNoteModalBtn = document.getElementById("closeNoteModalBtn");

  const paperModal = document.getElementById("paperModal");
  const paperModalTitle = document.getElementById("paperModalTitle");
  const paperModalVenue = document.getElementById("paperModalVenue");
  const paperModalYear = document.getElementById("paperModalYear");
  const paperModalTags = document.getElementById("paperModalTags");
  const paperModalAuthors = document.getElementById("paperModalAuthors");
  const paperModalSummary = document.getElementById("paperModalSummary");
  const paperModalPdf = document.getElementById("paperModalPdf");
  const paperModalProject = document.getElementById("paperModalProject");
  const paperModalCode = document.getElementById("paperModalCode");
  const addPaperToBoardBtn = document.getElementById("addPaperToBoardBtn");
  const removePaperFromBoardBtn = document.getElementById("removePaperFromBoardBtn");
  const closePaperModalBtn = document.getElementById("closePaperModalBtn");

  const exportModal = document.getElementById("exportModal");
  const exportTextarea = document.getElementById("exportTextarea");
  const copyExportBtn = document.getElementById("copyExportBtn");
  const closeExportModalBtn = document.getElementById("closeExportModalBtn");

  const state = {
    papers: [],
    searchText: "",
    boardItems: [],
    connections: [],
    selectedItemId: null,
    currentPaperModalId: null,
    editingNoteId: null,
    zoom: 1,
    canvasWidth: BOARD_MIN_WIDTH,
    canvasHeight: BOARD_MIN_HEIGHT
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 1600);
  }

  function saveLayout() {
    const payload = {
      boardItems: state.boardItems,
      connections: state.connections,
      zoom: state.zoom,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function loadLayout() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed.boardItems)) {
        state.boardItems = parsed.boardItems;
      }
      if (Array.isArray(parsed.connections)) {
        state.connections = parsed.connections;
      }
      if (typeof parsed.zoom === "number") {
        state.zoom = clamp(parsed.zoom, ZOOM_MIN, ZOOM_MAX);
      }
      if (typeof parsed.canvasWidth === "number") {
        state.canvasWidth = Math.max(BOARD_MIN_WIDTH, parsed.canvasWidth);
      }
      if (typeof parsed.canvasHeight === "number") {
        state.canvasHeight = Math.max(BOARD_MIN_HEIGHT, parsed.canvasHeight);
      }
    } catch (error) {
      console.error("Failed to load layout:", error);
    }
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  function loadTheme() {
    const theme = localStorage.getItem(THEME_KEY) || "light";
    document.body.classList.toggle("theme-dark", theme === "dark");
    document.body.classList.toggle("theme-light", theme !== "dark");
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains("theme-dark");
    const nextTheme = isDark ? "light" : "dark";
    document.body.classList.toggle("theme-dark", nextTheme === "dark");
    document.body.classList.toggle("theme-light", nextTheme !== "dark");
    saveTheme(nextTheme);
    showToast(nextTheme === "dark" ? "Dark mode on" : "Light mode on");
  }

  function getFilteredPapers() {
    const q = state.searchText.trim().toLowerCase();
    if (!q) return state.papers;

    return state.papers.filter((paper) => {
      const combined = [
        paper.title,
        paper.authors,
        paper.venue,
        String(paper.year || ""),
        paper.summary,
        Array.isArray(paper.tags) ? paper.tags.join(" ") : ""
      ]
        .join(" ")
        .toLowerCase();

      return combined.includes(q);
    });
  }

  function updateCounts() {
    if (paperCount) {
      paperCount.textContent = `${getFilteredPapers().length} papers`;
    }
    if (boardCount) {
      boardCount.textContent = `${state.boardItems.length} on board`;
    }
    if (emptyBoardHint) {
      emptyBoardHint.classList.toggle("hidden", state.boardItems.length > 0);
    }
    if (zoomIndicator) {
      zoomIndicator.textContent = `${Math.round(state.zoom * 100)}%`;
    }
  }

  function getPaperById(paperId) {
    return state.papers.find((paper) => paper.id === paperId) || null;
  }

  function getBoardItemById(itemId) {
    return state.boardItems.find((item) => item.id === itemId) || null;
  }

  function isPaperOnBoard(paperId) {
    return state.boardItems.some((item) => item.type === "paper" && item.paperId === paperId);
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeCanvasSize() {
    let requiredWidth = BOARD_MIN_WIDTH;
    let requiredHeight = BOARD_MIN_HEIGHT;

    state.boardItems.forEach((item) => {
      const x = Number(item.x) || 0;
      const y = Number(item.y) || 0;
      requiredWidth = Math.max(requiredWidth, x + ITEM_WIDTH + BOARD_PADDING);
      requiredHeight = Math.max(requiredHeight, y + ITEM_HEIGHT + BOARD_PADDING);
    });

    state.canvasWidth = requiredWidth;
    state.canvasHeight = requiredHeight;
  }

  function ensureCanvasFits(x, y, width = ITEM_WIDTH, height = ITEM_HEIGHT) {
    const needWidth = Math.max(BOARD_MIN_WIDTH, Math.ceil(x + width + BOARD_PADDING));
    const needHeight = Math.max(BOARD_MIN_HEIGHT, Math.ceil(y + height + BOARD_PADDING));

    let changed = false;

    if (needWidth > state.canvasWidth) {
      state.canvasWidth = needWidth;
      changed = true;
    }

    if (needHeight > state.canvasHeight) {
      state.canvasHeight = needHeight;
      changed = true;
    }

    return changed;
  }

  function renderPaperList() {
    const papers = getFilteredPapers();

    if (!paperList) return;

    if (!papers.length) {
      paperList.innerHTML = `<div class="paper-list-placeholder">No papers found.</div>`;
      updateCounts();
      return;
    }

    paperList.innerHTML = papers
      .map((paper) => {
        const tags = Array.isArray(paper.tags)
          ? paper.tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")
          : "";

        const onBoard = isPaperOnBoard(paper.id);

        return `
          <div class="paper-card">
            <div class="paper-card-title">${escapeHtml(paper.title)}</div>
            <div class="paper-card-meta">
              ${escapeHtml(paper.venue || "Unknown venue")} · ${escapeHtml(paper.year || "")}
            </div>
            <div class="paper-card-summary">${escapeHtml(paper.summary || "")}</div>
            <div class="paper-card-tags">${tags}</div>
            <div class="paper-card-actions">
              <button class="paper-small-btn add-paper-btn" data-paper-id="${escapeHtml(paper.id)}">
                ${onBoard ? "On Board" : "Add"}
              </button>
              <button class="paper-small-btn detail-paper-btn" data-paper-id="${escapeHtml(paper.id)}">
                Detail
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    paperList.querySelectorAll(".add-paper-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const paperId = btn.dataset.paperId;
        addPaperToBoard(paperId);
      });
    });

    paperList.querySelectorAll(".detail-paper-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const paperId = btn.dataset.paperId;
        openPaperModal(paperId);
      });
    });

    updateCounts();
  }

  function getDefaultBoardPosition(index = 0) {
    const cols = 5;
    const cardWidth = 320;
    const cardHeight = 220;
    const gapX = 50;
    const gapY = 40;
    const startX = 80;
    const startY = 80;

    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
      x: startX + col * (cardWidth + gapX),
      y: startY + row * (cardHeight + gapY)
    };
  }

  function updateBoardCanvasSize() {
    normalizeCanvasSize();
    if (!boardCanvas) return;
    boardCanvas.style.width = `${state.canvasWidth * state.zoom}px`;
    boardCanvas.style.height = `${state.canvasHeight * state.zoom}px`;
  }

  function setZoom(nextZoom) {
    state.zoom = clamp(Number(nextZoom) || 1, ZOOM_MIN, ZOOM_MAX);
    saveLayout();
    renderBoard();
  }

  function makeBoardItemDraggable(element, itemId) {
    const header = element.querySelector(".node-header");
    if (!header) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;

    header.addEventListener("mousedown", (event) => {
      isDragging = true;
      state.selectedItemId = itemId;
      renderBoard();

      const item = getBoardItemById(itemId);
      if (!item) return;

      startX = event.clientX;
      startY = event.clientY;
      originX = item.x;
      originY = item.y;

      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (event) => {
      if (!isDragging) return;

      const item = getBoardItemById(itemId);
      if (!item) return;

      const dx = (event.clientX - startX) / state.zoom;
      const dy = (event.clientY - startY) / state.zoom;

      item.x = Math.max(0, originX + dx);
      item.y = Math.max(0, originY + dy);

      const expanded = ensureCanvasFits(item.x, item.y);
      renderBoard();

      if (expanded && board) {
        board.scrollLeft = Math.max(board.scrollLeft, item.x * state.zoom - 300);
        board.scrollTop = Math.max(board.scrollTop, item.y * state.zoom - 200);
      }
    });

    window.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = "";
      saveLayout();
    });
  }

  function openPaperModal(paperId) {
    const paper = getPaperById(paperId);
    if (!paper) return;

    state.currentPaperModalId = paperId;
    if (paperModalTitle) paperModalTitle.textContent = paper.title || "Paper";
    if (paperModalVenue) paperModalVenue.textContent = paper.venue || "Venue";
    if (paperModalYear) paperModalYear.textContent = String(paper.year || "Year");
    if (paperModalTags) {
      paperModalTags.textContent =
        Array.isArray(paper.tags) && paper.tags.length ? paper.tags.join(", ") : "No tags";
    }
    if (paperModalAuthors) paperModalAuthors.textContent = paper.authors || "";
    if (paperModalSummary) paperModalSummary.textContent = paper.summary || "";

    setModalLink(paperModalPdf, paper.pdf);
    setModalLink(paperModalProject, paper.project);
    setModalLink(paperModalCode, paper.code);

    const onBoard = isPaperOnBoard(paperId);
    if (addPaperToBoardBtn) {
      addPaperToBoardBtn.textContent = onBoard ? "Already on Board" : "Add to Board";
    }
    if (removePaperFromBoardBtn) {
      removePaperFromBoardBtn.disabled = !onBoard;
      removePaperFromBoardBtn.style.opacity = onBoard ? "1" : "0.5";
    }

    if (paperModal) {
      paperModal.classList.remove("hidden");
    }
  }

  function closePaperModal() {
    if (paperModal) paperModal.classList.add("hidden");
    state.currentPaperModalId = null;
  }

  function setModalLink(anchor, href) {
    if (!anchor) return;
    if (href) {
      anchor.href = href;
      anchor.style.pointerEvents = "auto";
      anchor.style.opacity = "1";
    } else {
      anchor.href = "#";
      anchor.style.pointerEvents = "none";
      anchor.style.opacity = "0.45";
    }
  }

  function openNoteModal(noteId = null, x = 80, y = 80) {
    state.editingNoteId = noteId;

    if (noteId) {
      const item = getBoardItemById(noteId);
      if (!item) return;
      if (noteModalTitle) noteModalTitle.textContent = "Edit Note";
      if (noteTitleInput) noteTitleInput.value = item.title || "";
      if (noteTextInput) noteTextInput.value = item.text || "";
      if (deleteNoteBtn) deleteNoteBtn.classList.remove("hidden");
    } else {
      if (noteModalTitle) noteModalTitle.textContent = "Add Note";
      if (noteTitleInput) noteTitleInput.value = "";
      if (noteTextInput) noteTextInput.value = "";
      if (deleteNoteBtn) deleteNoteBtn.classList.add("hidden");
      if (noteModal) {
        noteModal.dataset.newX = String(x);
        noteModal.dataset.newY = String(y);
      }
    }

    if (noteModal) noteModal.classList.remove("hidden");
  }

  function closeNoteModal() {
    if (noteModal) {
      noteModal.classList.add("hidden");
      delete noteModal.dataset.newX;
      delete noteModal.dataset.newY;
    }
    state.editingNoteId = null;
  }

  function openExportModal() {
    const payload = {
      boardItems: state.boardItems,
      connections: state.connections,
      zoom: state.zoom,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight
    };
    if (exportTextarea) {
      exportTextarea.value = JSON.stringify(payload, null, 2);
    }
    if (exportModal) {
      exportModal.classList.remove("hidden");
    }
  }

  function closeExportModal() {
    if (exportModal) exportModal.classList.add("hidden");
  }

  function addPaperToBoard(paperId, x = null, y = null) {
    if (isPaperOnBoard(paperId)) {
      showToast("This paper is already on the board");
      renderPaperList();
      return;
    }

    const paper = getPaperById(paperId);
    if (!paper) return;

    const pos =
      x === null || y === null
        ? getDefaultBoardPosition(state.boardItems.length)
        : { x, y };

    ensureCanvasFits(pos.x, pos.y);

    state.boardItems.push({
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: "paper",
      paperId: paper.id,
      x: pos.x,
      y: pos.y
    });

    saveLayout();
    renderPaperList();
    renderBoard();
    showToast("Paper added");
  }

  function removePaperFromBoard(paperId) {
    const target = state.boardItems.find(
      (item) => item.type === "paper" && item.paperId === paperId
    );
    if (!target) return;

    removeBoardItem(target.id);
    closePaperModal();
  }

  function removeBoardItem(itemId) {
    state.boardItems = state.boardItems.filter((item) => item.id !== itemId);
    state.connections = state.connections.filter(
      (conn) => conn.from !== itemId && conn.to !== itemId
    );

    if (state.selectedItemId === itemId) {
      state.selectedItemId = null;
    }

    saveLayout();
    renderPaperList();
    renderBoard();
    showToast("Item removed");
  }

  function saveNoteFromModal() {
    const title = noteTitleInput?.value.trim() || "Note";
    const text = noteTextInput?.value.trim() || "";

    if (state.editingNoteId) {
      const item = getBoardItemById(state.editingNoteId);
      if (!item) return;
      item.title = title;
      item.text = text;
    } else {
      const x = Number(noteModal?.dataset.newX || 80);
      const y = Number(noteModal?.dataset.newY || 80);

      ensureCanvasFits(x, y);

      state.boardItems.push({
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "note",
        title,
        text,
        x,
        y
      });
    }

    saveLayout();
    renderBoard();
    closeNoteModal();
    showToast("Note saved");
  }

  function deleteNoteFromModal() {
    if (!state.editingNoteId) return;
    removeBoardItem(state.editingNoteId);
    closeNoteModal();
  }

  function createPaperNodeHtml(item, paper) {
    const authors = paper.authors ? paper.authors : "";
    const summary = paper.summary ? paper.summary : "";

    return `
      <div class="node-header">
        <div class="node-type">Paper</div>
        <button class="node-menu-btn node-remove-btn" data-item-id="${escapeHtml(item.id)}">×</button>
      </div>
      <div class="node-body">
        <div class="node-title">${escapeHtml(paper.title || "")}</div>
        <div class="node-subtitle">
          ${escapeHtml(paper.venue || "Venue")} · ${escapeHtml(paper.year || "")}
        </div>
        <div class="node-text">${escapeHtml(summary)}</div>
      </div>
      <div class="node-footer">
        ${paper.pdf ? `<a class="node-link" href="${escapeHtml(paper.pdf)}" target="_blank" rel="noopener noreferrer">PDF</a>` : ""}
        ${paper.project ? `<a class="node-link" href="${escapeHtml(paper.project)}" target="_blank" rel="noopener noreferrer">Project</a>` : ""}
        ${paper.code ? `<a class="node-link" href="${escapeHtml(paper.code)}" target="_blank" rel="noopener noreferrer">Code</a>` : ""}
        ${authors ? `<span class="node-link" title="${escapeHtml(authors)}">Authors</span>` : ""}
      </div>
    `;
  }

  function createNoteNodeHtml(item) {
    return `
      <div class="node-header">
        <div class="node-type">Note</div>
        <button class="node-menu-btn node-remove-btn" data-item-id="${escapeHtml(item.id)}">×</button>
      </div>
      <div class="node-body">
        <div class="node-title">${escapeHtml(item.title || "Note")}</div>
        <div class="node-text">${escapeHtml(item.text || "")}</div>
      </div>
    `;
  }

  function renderConnections() {
    if (!boardCanvas || !connectionSvg) return;

    const canvasRect = boardCanvas.getBoundingClientRect();

    const lines = state.connections
      .map((conn) => {
        const fromEl = document.querySelector(`[data-board-item-id="${conn.from}"]`);
        const toEl = document.querySelector(`[data-board-item-id="${conn.to}"]`);
        if (!fromEl || !toEl) return "";

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const x1 = fromRect.left - canvasRect.left + fromRect.width / 2;
        const y1 = fromRect.top - canvasRect.top + fromRect.height / 2;
        const x2 = toRect.left - canvasRect.left + toRect.width / 2;
        const y2 = toRect.top - canvasRect.top + toRect.height / 2;

        const midX = (x1 + x2) / 2;

        return `
          <path
            class="connection-line"
            d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}"
          ></path>
        `;
      })
      .join("");

    connectionSvg.innerHTML = lines;
  }

  function renderBoard() {
    if (!boardItemsLayer) return;

    updateBoardCanvasSize();

    boardItemsLayer.innerHTML = state.boardItems
      .map((item) => {
        const isSelected = state.selectedItemId === item.id;
        const paper = item.type === "paper" ? getPaperById(item.paperId) : null;

        if (item.type === "paper" && !paper) {
          return "";
        }

        return `
          <div
            class="board-item ${item.type === "paper" ? "paper-node" : "note-node"} ${isSelected ? "selected" : ""}"
            data-board-item-id="${escapeHtml(item.id)}"
            style="
              left:${(Number(item.x) || 0) * state.zoom}px;
              top:${(Number(item.y) || 0) * state.zoom}px;
              transform: scale(${state.zoom});
              transform-origin: top left;
            "
          >
            ${item.type === "paper" ? createPaperNodeHtml(item, paper) : createNoteNodeHtml(item)}
          </div>
        `;
      })
      .join("");

    document.querySelectorAll(".board-item").forEach((element) => {
      const itemId = element.dataset.boardItemId;

      element.addEventListener("click", (event) => {
        event.stopPropagation();
        state.selectedItemId = itemId;
        renderBoard();
      });

      element.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        const item = getBoardItemById(itemId);
        if (!item) return;

        if (item.type === "paper") {
          openPaperModal(item.paperId);
        } else {
          openNoteModal(item.id);
        }
      });

      const removeBtn = element.querySelector(".node-remove-btn");
      if (removeBtn) {
        removeBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          removeBoardItem(itemId);
        });
      }

      makeBoardItemDraggable(element, itemId);
    });

    renderConnections();
    updateCounts();
  }

  function placeAllPapers() {
    state.papers.forEach((paper) => {
      if (!isPaperOnBoard(paper.id)) {
        const pos = getDefaultBoardPosition(state.boardItems.length);
        ensureCanvasFits(pos.x, pos.y);

        state.boardItems.push({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "paper",
          paperId: paper.id,
          x: pos.x,
          y: pos.y
        });
      }
    });

    saveLayout();
    renderPaperList();
    renderBoard();
    showToast("All papers placed");
  }

  function connectBoardItems() {
    if (state.boardItems.length < 2) {
      showToast("Need at least 2 items");
      return;
    }

    const sorted = [...state.boardItems].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    const nextConnections = [];
    for (let i = 0; i < sorted.length - 1; i += 1) {
      nextConnections.push({
        from: sorted[i].id,
        to: sorted[i + 1].id
      });
    }

    state.connections = nextConnections;
    saveLayout();
    renderBoard();
    showToast("Connected");
  }

  function resetBoard() {
    const ok = window.confirm("Reset the whole board?");
    if (!ok) return;

    state.boardItems = [];
    state.connections = [];
    state.selectedItemId = null;
    state.canvasWidth = BOARD_MIN_WIDTH;
    state.canvasHeight = BOARD_MIN_HEIGHT;
    saveLayout();
    renderPaperList();
    renderBoard();
    showToast("Board reset");
  }

  function exportLayout() {
    openExportModal();
  }

  function importLayoutFromText(rawText) {
    try {
      const parsed = JSON.parse(rawText);

      if (!Array.isArray(parsed.boardItems) || !Array.isArray(parsed.connections)) {
        throw new Error("Invalid layout format");
      }

      state.boardItems = parsed.boardItems;
      state.connections = parsed.connections;
      if (typeof parsed.zoom === "number") {
        state.zoom = clamp(parsed.zoom, ZOOM_MIN, ZOOM_MAX);
      }
      if (typeof parsed.canvasWidth === "number") {
        state.canvasWidth = Math.max(BOARD_MIN_WIDTH, parsed.canvasWidth);
      } else {
        state.canvasWidth = BOARD_MIN_WIDTH;
      }
      if (typeof parsed.canvasHeight === "number") {
        state.canvasHeight = Math.max(BOARD_MIN_HEIGHT, parsed.canvasHeight);
      } else {
        state.canvasHeight = BOARD_MIN_HEIGHT;
      }

      state.selectedItemId = null;

      saveLayout();
      renderPaperList();
      renderBoard();
      showToast("Layout imported");
    } catch (error) {
      alert("Import failed. Please check your JSON file.");
      console.error(error);
    }
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importLayoutFromText(reader.result);
    };
    reader.readAsText(file);
  }

  async function loadPapers() {
    try {
      const response = await fetch("papers.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch papers.json: ${response.status}`);
      }

      const data = await response.json();
      state.papers = Array.isArray(data) ? data : Array.isArray(data.papers) ? data.papers : [];

      renderPaperList();
      renderBoard();
    } catch (error) {
      console.error(error);
      if (paperList) {
        paperList.innerHTML = `
          <div class="paper-list-placeholder">
            Failed to load papers.json
          </div>
        `;
      }
      updateCounts();
    }
  }

  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        state.searchText = searchInput.value;
        renderPaperList();
      });
    }

    if (placeAllBtn) placeAllBtn.addEventListener("click", placeAllPapers);
    if (connectBtn) connectBtn.addEventListener("click", connectBoardItems);
    if (exportBtn) exportBtn.addEventListener("click", exportLayout);

    if (importBtn) {
      importBtn.addEventListener("click", () => {
        if (importFileInput) {
          importFileInput.click();
        }
      });
    }

    if (importFileInput) {
      importFileInput.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        handleImportFile(file);
        importFileInput.value = "";
      });
    }

    if (resetBtn) resetBtn.addEventListener("click", resetBoard);
    if (darkBtn) darkBtn.addEventListener("click", toggleTheme);

    if (fsBtn) {
      fsBtn.addEventListener("click", async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
            showToast("Full screen on");
          } else {
            await document.exitFullscreen();
            showToast("Full screen off");
          }
        } catch (error) {
          console.error(error);
        }
      });
    }

    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", () => {
        setZoom(state.zoom + ZOOM_STEP);
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", () => {
        setZoom(state.zoom - ZOOM_STEP);
      });
    }

    if (zoomIndicator) {
      zoomIndicator.addEventListener("click", () => {
        setZoom(1);
      });
    }

    if (board) {
      board.addEventListener("click", () => {
        state.selectedItemId = null;
        renderBoard();
      });

      board.addEventListener("dblclick", (event) => {
        const clickedInsideItem = event.target.closest(".board-item");
        if (clickedInsideItem) return;

        const rect = boardCanvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / state.zoom;
        const y = (event.clientY - rect.top) / state.zoom;
        openNoteModal(null, x, y);
      });

      board.addEventListener(
        "wheel",
        (event) => {
          if (!event.ctrlKey) return;
          event.preventDefault();

          if (event.deltaY < 0) {
            setZoom(state.zoom + ZOOM_STEP);
          } else {
            setZoom(state.zoom - ZOOM_STEP);
          }
        },
        { passive: false }
      );
    }

    if (closeNoteModalBtn) closeNoteModalBtn.addEventListener("click", closeNoteModal);
    if (saveNoteBtn) saveNoteBtn.addEventListener("click", saveNoteFromModal);
    if (deleteNoteBtn) deleteNoteBtn.addEventListener("click", deleteNoteFromModal);

    if (closePaperModalBtn) closePaperModalBtn.addEventListener("click", closePaperModal);

    if (addPaperToBoardBtn) {
      addPaperToBoardBtn.addEventListener("click", () => {
        if (!state.currentPaperModalId) return;
        addPaperToBoard(state.currentPaperModalId);
        openPaperModal(state.currentPaperModalId);
      });
    }

    if (removePaperFromBoardBtn) {
      removePaperFromBoardBtn.addEventListener("click", () => {
        if (!state.currentPaperModalId) return;
        removePaperFromBoard(state.currentPaperModalId);
      });
    }

    if (closeExportModalBtn) closeExportModalBtn.addEventListener("click", closeExportModal);

    if (copyExportBtn) {
      copyExportBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(exportTextarea.value);
          showToast("Copied");
        } catch (error) {
          console.error(error);
          alert("Copy failed");
        }
      });
    }

    if (noteModal) {
      noteModal.addEventListener("click", (event) => {
        if (event.target === noteModal) closeNoteModal();
      });
    }

    if (paperModal) {
      paperModal.addEventListener("click", (event) => {
        if (event.target === paperModal) closePaperModal();
      });
    }

    if (exportModal) {
      exportModal.addEventListener("click", (event) => {
        if (event.target === exportModal) closeExportModal();
      });
    }

    window.addEventListener("resize", renderConnections);
  }

  function init() {
    loadTheme();
    loadLayout();
    bindEvents();
    loadPapers();
  }

  init();
});
