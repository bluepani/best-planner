import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import BlockCard from "./BlockCard";
import {
  formatDuration,
  formatTime,
  getProgressStatus,
  getTypeColor,
} from "../utils/time";

const AUTO_FUN_ID = "auto-fun-block";
const MIN_BLOCK_HEIGHT = 52;
const TARGET_STACK_HEIGHT = 560;

function ordersMatch(first, second) {
  return first.length === second.length && first.every((id, index) => id === second[index]);
}

function moveId(order, draggedId, insertIndex) {
  const currentIndex = order.indexOf(draggedId);
  if (currentIndex < 0) return order;

  const withoutDragged = order.filter((id) => id !== draggedId);
  const adjustedIndex = currentIndex < insertIndex ? insertIndex - 1 : insertIndex;
  const nextIndex = Math.min(Math.max(0, adjustedIndex), withoutDragged.length);
  const nextOrder = [...withoutDragged];
  nextOrder.splice(nextIndex, 0, draggedId);
  return nextOrder;
}

function lockedBlocksStayPut(sourceOrder, nextOrder, itemById) {
  return sourceOrder.every((id, index) => {
    const item = itemById.get(id);
    if (item?.kind !== "block" || !item.block.locked) return true;
    return nextOrder.indexOf(id) === index;
  });
}

function getBlockHeight(duration, pxPerMinute) {
  return Math.max(MIN_BLOCK_HEIGHT, Math.round(Number(duration || 0) * pxPerMinute));
}

function formatPrintDate(dateKey) {
  if (!dateKey) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export default function BlockList({
  blocks,
  freeBlock,
  warning,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove,
  onCommitOrder,
  typeDefinitions,
  selectedDate,
  currentTime,
}) {
  const nodeRefs = useRef(new Map());
  const draggingId = useRef("");
  const committedDrop = useRef(false);
  const previousPositions = useRef(null);

  const itemById = useMemo(() => {
    const items = new Map();
    blocks.forEach((block) => {
      items.set(block.id, {
        id: block.id,
        kind: "block",
        block,
      });
    });

    if (freeBlock && freeBlock.duration > 0) {
      items.set(AUTO_FUN_ID, {
        id: AUTO_FUN_ID,
        kind: "free",
        block: freeBlock,
      });
    }

    return items;
  }, [blocks, freeBlock]);

  const sourceOrder = useMemo(() => {
    const order = blocks.map((block) => block.id);
    if (freeBlock && freeBlock.duration > 0) {
      const index = Math.min(
        Math.max(0, Number(freeBlock.orderIndex) || 0),
        blocks.length,
      );
      order.splice(index, 0, AUTO_FUN_ID);
    }
    return order;
  }, [blocks, freeBlock]);

  const [previewOrder, setPreviewOrder] = useState(sourceOrder);
  const [dragInsertIndex, setDragInsertIndex] = useState(null);

  const orderedItems = useMemo(
    () => previewOrder.map((id) => itemById.get(id)).filter(Boolean),
    [previewOrder, itemById],
  );

  const totalDuration = useMemo(
    () =>
      orderedItems.reduce(
        (total, item) => total + Math.max(0, Number(item.block.duration) || 0),
        0,
      ),
    [orderedItems],
  );

  const pxPerMinute = useMemo(() => {
    if (!totalDuration) return 2;
    return Math.max(1.15, TARGET_STACK_HEIGHT / totalDuration);
  }, [totalDuration]);

  const nowMarker = useMemo(() => {
    if (!orderedItems.length) return null;

    const nowMinutes = (() => {
      const [year, month, day] = selectedDate.split("-").map(Number);
      if (!(currentTime instanceof Date)) return null;
      if (
        currentTime.getFullYear() !== year ||
        currentTime.getMonth() !== month - 1 ||
        currentTime.getDate() !== day
      ) {
        return null;
      }
      return (
        currentTime.getHours() * 60 +
        currentTime.getMinutes() +
        currentTime.getSeconds() / 60
      );
    })();

    if (nowMinutes === null) return null;

    const rangeStart = Number(orderedItems[0].block.start);
    const rangeEnd = Number(orderedItems[orderedItems.length - 1].block.end);
    if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeEnd <= rangeStart) {
      return null;
    }
    if (nowMinutes < rangeStart || nowMinutes > rangeEnd) return null;

    const gap = 8;
    let offset = 0;
    let totalHeight = 0;

    orderedItems.forEach((item, index) => {
      const height = getBlockHeight(item.block.duration, pxPerMinute);
      const start = Number(item.block.start);
      const end = Number(item.block.end);
      const span = Math.max(end - start, 1);

      if (nowMinutes >= end) {
        offset += height + (index < orderedItems.length - 1 ? gap : 0);
      } else if (nowMinutes >= start) {
        offset += height * ((nowMinutes - start) / span);
      }

      totalHeight += height + (index < orderedItems.length - 1 ? gap : 0);
    });

    if (totalHeight <= 0) return null;

    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const suffix = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;

    return {
      percent: (offset / totalHeight) * 100,
      label: `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`,
    };
  }, [orderedItems, selectedDate, currentTime, pxPerMinute]);

  function canMove(index, direction) {
    const block = blocks[index];
    const target = blocks[index + direction];
    return Boolean(block && target && !block.locked && !target.locked);
  }

  function setItemNode(id, node) {
    if (node) {
      nodeRefs.current.set(id, node);
    } else {
      nodeRefs.current.delete(id);
    }
  }

  function rememberPositions() {
    previousPositions.current = new Map(
      Array.from(nodeRefs.current.entries()).map(([id, node]) => [
        id,
        node.getBoundingClientRect(),
      ]),
    );
  }

  function resetDrag(cancelled = false) {
    draggingId.current = "";
    setDragInsertIndex(null);
    if (cancelled) {
      setPreviewOrder(sourceOrder);
    }
  }

  function canDrag(id) {
    const item = itemById.get(id);
    return Boolean(item && (item.kind === "free" || !item.block.locked));
  }

  function previewInsert(insertIndex) {
    const draggedId = draggingId.current;
    if (!draggedId) return;

    const nextOrder = moveId(previewOrder, draggedId, insertIndex);
    if (
      ordersMatch(previewOrder, nextOrder) ||
      !lockedBlocksStayPut(sourceOrder, nextOrder, itemById)
    ) {
      return;
    }

    rememberPositions();
    setPreviewOrder(nextOrder);
    setDragInsertIndex(nextOrder.indexOf(draggedId));
  }

  function handleDragStart(id, event) {
    if (!canDrag(id)) {
      event.preventDefault();
      return;
    }

    draggingId.current = id;
    committedDrop.current = false;
    setDragInsertIndex(previewOrder.indexOf(id));
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(id, event) {
    event.preventDefault();
    event.stopPropagation();

    if (!draggingId.current) return;

    const index = previewOrder.indexOf(id);
    if (index < 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const insertIndex = event.clientY > rect.top + rect.height / 2 ? index + 1 : index;
    previewInsert(insertIndex);
  }

  function handleStackDragOver(event) {
    if (!draggingId.current) return;
    event.preventDefault();

    let insertIndex = previewOrder.length;
    previewOrder.some((id, index) => {
      const node = nodeRefs.current.get(id);
      if (!node) return false;

      const rect = node.getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        insertIndex = index;
        return true;
      }
      return false;
    });

    previewInsert(insertIndex);
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!draggingId.current) return;

    const nextOrder = previewOrder.filter((id) => itemById.has(id));
    const blockIds = nextOrder.filter((id) => itemById.get(id)?.kind === "block");
    const freeIndex = nextOrder.includes(AUTO_FUN_ID)
      ? nextOrder.indexOf(AUTO_FUN_ID)
      : blockIds.length;

    committedDrop.current = true;
    resetDrag(false);
    onCommitOrder(blockIds, freeIndex);
  }

  function handleDragEnd() {
    if (committedDrop.current) {
      committedDrop.current = false;
      return;
    }
    resetDrag(true);
  }

  useEffect(() => {
    if (!draggingId.current && !ordersMatch(previewOrder, sourceOrder)) {
      setPreviewOrder(sourceOrder);
    }
  }, [previewOrder, sourceOrder]);

  useLayoutEffect(() => {
    const positions = previousPositions.current;
    if (!positions) return;
    previousPositions.current = null;

    previewOrder.forEach((id) => {
      const node = nodeRefs.current.get(id);
      const previous = positions.get(id);
      if (!node || !previous) return;

      const next = node.getBoundingClientRect();
      const x = previous.left - next.left;
      const y = previous.top - next.top;
      if (Math.abs(x) < 1 && Math.abs(y) < 1) return;

      node.animate(
        [
          { transform: `translate(${x}px, ${y}px)` },
          { transform: "translate(0, 0)" },
        ],
        {
          duration: 190,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        },
      );
    });
  }, [previewOrder]);

  return (
    <section className="schedule-panel">
      <div className="schedule-header">
        <div>
          <p className="eyebrow">Schedule</p>
          <h2>Block Order</h2>
          <p className="print-schedule-date">{formatPrintDate(selectedDate)}</p>
        </div>
      </div>

      {warning ? <p className="warning-banner">{warning}</p> : null}

      <div
        className={`block-stack ${draggingId.current ? "dragging" : ""}`}
        onDragOver={handleStackDragOver}
        onDrop={handleDrop}
      >
        {orderedItems.length === 0 ? <div className="empty-state">No blocks yet.</div> : null}

        {orderedItems.length > 0 ? (
          <div className="schedule-timeline">
            {nowMarker ? (
              <div
                className="now-line"
                style={{ top: `${nowMarker.percent}%` }}
                aria-hidden="true"
              >
                <span className="now-line-label">{nowMarker.label}</span>
              </div>
            ) : null}

            {orderedItems.map((item, index) => {
              const isDragSource = draggingId.current === item.id;
              const showDropLine = dragInsertIndex === index && draggingId.current;
              const progressStatus = getProgressStatus(selectedDate, item.block, currentTime);
              const blockHeight = getBlockHeight(item.block.duration, pxPerMinute);

              return (
                <div
                  className={`schedule-item ${isDragSource ? "is-dragging" : ""} ${progressStatus === "current" ? "is-current" : ""}`}
                  key={item.id}
                  ref={(node) => setItemNode(item.id, node)}
                  style={{
                    "--block-duration": Math.max(1, Number(item.block.duration) || 1),
                    height: `${blockHeight}px`,
                    minHeight: `${blockHeight}px`,
                  }}
                >
                  {showDropLine ? <div className="drop-line" aria-hidden="true" /> : null}

                  {item.kind === "block" ? (
                    <BlockCard
                      block={item.block}
                      index={blocks.findIndex((block) => block.id === item.id)}
                      canMoveUp={canMove(blocks.findIndex((block) => block.id === item.id), -1)}
                      canMoveDown={canMove(blocks.findIndex((block) => block.id === item.id), 1)}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onDuplicate={onDuplicate}
                      onMove={onMove}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      isDragSource={isDragSource}
                      progressStatus={progressStatus}
                      typeDefinitions={typeDefinitions}
                    />
                  ) : (
                    <article
                      className={`block-card auto-fun-block progress-${progressStatus} ${isDragSource ? "drag-source" : ""}`}
                      draggable
                      onDragStart={(event) => handleDragStart(AUTO_FUN_ID, event)}
                      onDragOver={(event) => handleDragOver(AUTO_FUN_ID, event)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      style={{ "--block-color": getTypeColor("Fun", typeDefinitions) }}
                      aria-label="Move automatic fun time"
                      title="Drag automatic fun time"
                    >
                      <span
                        className="block-color-dot"
                        style={{ backgroundColor: getTypeColor("Fun", typeDefinitions) }}
                      />
                      <div className="block-time">
                        <strong>
                          {formatTime(item.block.start)}-{formatTime(item.block.end)}
                        </strong>
                        <small className="block-duration">
                          {formatDuration(item.block.duration)}
                        </small>
                      </div>
                      <div className="block-summary">
                        <h3>Fun Time</h3>
                      </div>
                      <span
                        className="type-chip"
                        style={{ "--chip-color": getTypeColor("Fun", typeDefinitions) }}
                      >
                        Fun
                      </span>
                    </article>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
