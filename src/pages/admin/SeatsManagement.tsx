import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import {
  X,
  Loader2,
  Tv,
  RotateCcw,
  Grid,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Download,
  Upload,
  Hand,
  MousePointer,
  Check,
  Info,
  Footprints,
  Copy,
  Clipboard,
  ShieldAlert,
  Save,
  RefreshCw,
  Heart,
  MoreVertical,
  Settings
} from 'lucide-react';

// Type definitions matching requested architecture
type SeatTypeCategory = 'Standard' | 'VIP' | 'Couple' | 'Disabled';

interface Seat {
  id: string; // row-col format e.g. "A-5"
  row: string;
  col: number;
  seatCode: string;
  type: SeatTypeCategory | 'Aisle';
  status: 'Available' | 'Maintenance' | 'Disabled';
  dbId?: number;
  sectionId?: string;
}

interface Aisle {
  type: 'vertical' | 'horizontal';
  index: number; // Column index (1-based) or Row index (0-based A=0)
}

interface Section {
  id: string;
  name: string;
  type: 'Standard' | 'VIP' | 'Couple';
  priceMultiplier: number;
  color: string;
}

interface SeatLayout {
  rows: number;
  cols: number;
  screenPosition: 'TOP';
  aisles: Aisle[];
  sections: Section[];
  seats: Seat[];
}

interface Hall {
  hallId: number;
  cinemaId: number;
  cinemaName?: string;
  hallName: string;
  hallTypeId: number;
  hallTypeName: string;
  capacity: number;
  hallCode: string;
  description?: string;
}

// ----------------------------------------------------
// 1. Memoized Seat Component
// ----------------------------------------------------
interface SeatComponentProps {
  row: string;
  col: number;
  type: SeatTypeCategory | 'Aisle' | 'Empty';
  status: 'Available' | 'Maintenance' | 'Disabled';
  seatCode: string;
  isSelected: boolean;
  isSelecting: boolean;
  curveYOffset: number;
  curveRotation: number;
  isSweetboxLeft: boolean;
  isSweetboxRight: boolean;
  onClick: (row: string, col: number, e: React.MouseEvent) => void;
  onMouseEnter: (row: string, col: number) => void;
  onMouseDown: (row: string, col: number, e: React.MouseEvent) => void;
  onDragStart: (key: string, e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (key: string, e: React.DragEvent) => void;
  isDraggable: boolean;
  isFirstCoupleSelected: boolean;
}

const MemoizedSeat: React.FC<SeatComponentProps> = React.memo(({
  row,
  col,
  type,
  status,
  seatCode,
  isSelected,
  isSelecting,
  curveYOffset,
  curveRotation,
  isSweetboxLeft,
  isSweetboxRight,
  onClick,
  onMouseEnter,
  onMouseDown,
  onDragStart,
  onDragOver,
  onDrop,
  isDraggable,
  isFirstCoupleSelected
}) => {
  const seatKey = `${row}-${col}`;

  const getColorClass = () => {
    if (isFirstCoupleSelected) {
      return 'bg-pink-650 text-white border-pink-400 ring-2 ring-pink-500/40 scale-105 z-10 shadow-lg shadow-pink-500/40';
    }
    if (isSelected || isSelecting) {
      return 'bg-purple-600 text-white border-purple-450 ring-2 ring-purple-500/40 scale-105 z-10 shadow-lg shadow-purple-500/40';
    }
    if (status === 'Maintenance') {
      return 'bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30 shadow-sm shadow-amber-500/10';
    }
    if (type === 'Empty') {
      return 'bg-transparent text-slate-700 border-dashed border-slate-800 hover:border-slate-700';
    }
    if (type === 'Aisle') {
      return 'bg-slate-900/55 text-slate-500 border border-slate-850';
    }
    if (type === 'Disabled' || status === 'Disabled') {
      return 'bg-slate-800/80 text-slate-500 border-slate-750 hover:bg-slate-750';
    }
    if (type === 'VIP') {
      return 'bg-red-950/60 text-red-200 border-red-800/70 hover:bg-red-900/50 shadow-sm';
    }
    if (type === 'Couple') {
      return 'bg-pink-950/60 text-pink-200 border-pink-855/70 hover:bg-pink-900/50 shadow-sm';
    }
    // Standard seat
    return 'bg-purple-950/60 text-purple-200 border-purple-800/70 hover:bg-purple-900/50 shadow-sm';
  };

  const transformStyle = {
    transform: `translateY(${curveYOffset}px) rotate(${curveRotation}deg)`,
    gridColumn: isSweetboxLeft ? 'span 2' : undefined,
    display: isSweetboxRight ? 'none' : 'flex'
  };

  return (
    <div
      onClick={(e) => onClick(row, col, e)}
      onMouseEnter={() => onMouseEnter(row, col)}
      onMouseDown={(e) => onMouseDown(row, col, e)}
      onDragStart={(e) => onDragStart(seatKey, e)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(seatKey, e)}
      draggable={isDraggable}
      style={transformStyle}
      className={`seat-element h-9 md:h-10 ${isSweetboxLeft ? 'w-full' : 'w-9 md:w-10'} rounded-xl border text-[9px] font-black uppercase tracking-wider flex items-center justify-center transition-all select-none cursor-pointer ${getColorClass()}`}
      data-key={seatKey}
      title={type === 'Empty' ? 'Khoảng trống' : type === 'Aisle' ? 'Lối đi' : `Ghế ${seatCode}\nLoại: ${type}\nTrạng thái: ${status}`}
    >
      {type === 'Empty' ? (
        ''
      ) : type === 'Aisle' ? (
        <Footprints size={12} className="opacity-30" />
      ) : type === 'Couple' ? (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <Heart size={10} className="fill-pink-500/40 text-pink-400 animate-pulse" />
          <span>{seatCode}</span>
        </div>
      ) : (
        <span>{seatCode}</span>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.row === nextProps.row &&
    prevProps.col === nextProps.col &&
    prevProps.type === nextProps.type &&
    prevProps.status === nextProps.status &&
    prevProps.seatCode === nextProps.seatCode &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSelecting === nextProps.isSelecting &&
    prevProps.curveYOffset === nextProps.curveYOffset &&
    prevProps.curveRotation === nextProps.curveRotation &&
    prevProps.isSweetboxLeft === nextProps.isSweetboxLeft &&
    prevProps.isSweetboxRight === nextProps.isSweetboxRight &&
    prevProps.isDraggable === nextProps.isDraggable &&
    prevProps.isFirstCoupleSelected === nextProps.isFirstCoupleSelected
  );
});

MemoizedSeat.displayName = 'MemoizedSeat';

export const SeatsManagement: React.FC = () => {
  const { showToast } = useToast();

  // Mode states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeMode, setActiveMode] = useState<'select' | 'pan'>('select');

  // Metadata from APIs
  const [halls, setHalls] = useState<Hall[]>([]);
  const [dbSeatTypes, setDbSeatTypes] = useState<SeatType[]>([]);

  // Selection & Configuration
  const [selectedCinemaId, setSelectedCinemaId] = useState<number>(0);
  const [selectedHallId, setSelectedHallId] = useState<number>(0);
  const [rowsCount, setRowsCount] = useState(10);
  const [colsCount, setColsCount] = useState(15);
  const [screenPosition] = useState<'TOP'>('TOP');
  const [curveStrength, setCurveStrength] = useState(0); // 0 (straight) to 4 (curved)

  // Cascading cinema & hall selection helpers
  const uniqueCinemas = useMemo(() => {
    const map = new Map<number, string>();
    halls.forEach(h => {
      if (h.cinemaId && h.cinemaName) {
        map.set(h.cinemaId, h.cinemaName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ cinemaId: id, cinemaName: name }));
  }, [halls]);

  const filteredHalls = useMemo(() => {
    if (!selectedCinemaId) return halls;
    return halls.filter(h => h.cinemaId === selectedCinemaId);
  }, [halls, selectedCinemaId]);

  // Layout State
  const [seats, setSeats] = useState<{ [key: string]: Seat }>({});
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [sections] = useState<Section[]>([
    { id: 'standard', name: 'Khu Thường', type: 'Standard', priceMultiplier: 1.0, color: 'emerald' },
    { id: 'vip', name: 'Khu VIP', type: 'VIP', priceMultiplier: 1.2, color: 'purple' },
    { id: 'couple', name: 'Khu Ghế Đôi', type: 'Couple', priceMultiplier: 1.5, color: 'pink' }
  ]);

  const [activeDrawingTool, setActiveDrawingTool] = useState<SeatTypeCategory | 'Aisle' | 'Empty' | 'Pointer'>('Pointer');
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newPriceMultiplier, setNewPriceMultiplier] = useState(1.0);

  // DB seats backup for mapping
  const [dbSeats, setDbSeats] = useState<any[]>([]);

  // Seat editor popup modal states
  const [editingSeatKey, setEditingSeatKey] = useState<string | null>(null);
  const [editSeatCode, setEditSeatCode] = useState('');
  const [editSeatType, setEditSeatType] = useState<SeatTypeCategory | 'Aisle' | 'Empty'>('Standard');
  const [editSeatStatus, setEditSeatStatus] = useState<'Available' | 'Maintenance' | 'Disabled'>('Available');
  const [editDbId, setEditDbId] = useState<number | undefined>(undefined);

  // Design helpers
  interface SeatType {
    seatTypeId: number;
    typeName: string;
    priceMultiplier: number;
  }

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<{ [key: string]: Seat } | null>(null);

  // Undo / Redo History Stacks
  const [history, setHistory] = useState<Array<{ seats: { [key: string]: Seat }; aisles: Aisle[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Zoom & Pan Offset States
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Drag marquee selection states (pixel-based relative to container)
  const [isSelecting, setIsSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number; clientRealX: number; clientRealY: number } | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{ x: number; y: number } | null>(null);
  const [selectingIds, setSelectingIds] = useState<Set<string>>(new Set());

  // Last clicked seat key (for Shift selection range)
  const [lastClickedKey, setLastClickedKey] = useState<string | null>(null);

  // Draggable canvas state
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [coupleFirstSeat, setCoupleFirstSeat] = useState<{ row: string; col: number } | null>(null);

  useEffect(() => {
    setCoupleFirstSeat(null);
  }, [activeDrawingTool]);

  // Sidebar / JSON View modal
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');

  // Row index helper (A -> Z mapping)
  const getRowLetter = (index: number): string => String.fromCharCode(65 + index);
  const getRowIndex = (letter: string): number => letter.charCodeAt(0) - 65;

  const getRowCouplePairs = useCallback((rowLetter: string) => {
    const pairs: { left: number; right: number }[] = [];
    const unpaired: number[] = [];

    // Find all columns in this row that are Couple seats
    const coupleCols: number[] = [];
    for (let c = 1; c <= colsCount; c++) {
      const key = `${rowLetter}-${c}`;
      if (seats[key] && seats[key].type === 'Couple') {
        coupleCols.push(c);
      }
    }

    // Sort column indices ascending
    coupleCols.sort((a, b) => a - b);

    let i = 0;
    while (i < coupleCols.length) {
      const col = coupleCols[i];
      // Check if the next column is adjacent (i.e. col + 1) AND is also a Couple seat
      if (i + 1 < coupleCols.length && coupleCols[i + 1] === col + 1) {
        pairs.push({ left: col, right: col + 1 });
        i += 2; // Skip both because they form a pair
      } else {
        unpaired.push(col);
        i += 1;
      }
    }

    return { pairs, unpaired };
  }, [seats, colsCount]);

  // Undo implementation
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setSeats(history[idx].seats);
      setAisles(history[idx].aisles);
      setSelectedIds(new Set());
      showToast('Đã Undo thao tác.', 'info');
    }
  }, [history, historyIndex]);

  // Redo implementation
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setSeats(history[idx].seats);
      setAisles(history[idx].aisles);
      setSelectedIds(new Set());
      showToast('Đã Redo thao tác.', 'info');
    }
  }, [history, historyIndex]);

  // Camera Zoom utility
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    if (direction === 'in') {
      setZoom(prev => Math.min(2.5, prev + 0.15));
    } else if (direction === 'out') {
      setZoom(prev => Math.max(0.4, prev - 0.15));
    } else {
      setZoom(1.0);
      setPanX(0);
      setPanY(0);
    }
  }, []);



  // Space & hotkeys event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space to toggle pan mode
      if (e.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setActiveMode(prev => prev === 'select' ? 'pan' : 'select');
      }
      // Ctrl + Z
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl + Y
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (selectedHallId > 0) {
      fetchHallSeats(selectedHallId);
      const hall = halls.find(h => h.hallId === selectedHallId);
      if (hall && hall.cinemaId !== selectedCinemaId) {
        setSelectedCinemaId(hall.cinemaId);
      }
    }
  }, [selectedHallId, halls, selectedCinemaId]);

  // Retrieve initial metadata from database
  const fetchMetadata = async () => {
    setLoading(true);
    try {
      const typesRes = await apiClient.get<any[]>('/seattypes');
      const typesData = typesRes.data || [];
      setDbSeatTypes(typesData.map((t: any) => ({
        seatTypeId: t.seatTypeId,
        typeName: t.typeName,
        priceMultiplier: t.priceMultiplier || 1.0
      })));

      const cinemasRes = await apiClient.get<any>('/cinemas', { params: { PageSize: 1000 } });
      const cinemasData = cinemasRes.data?.data ?? cinemasRes.data;
      const cinemas = cinemasData?.items ?? (Array.isArray(cinemasData) ? cinemasData : []);

      if (Array.isArray(cinemas) && cinemas.length > 0) {
        const promises = cinemas.map(async (cinema: any) => {
          try {
            const res = await apiClient.get<any>(`/cinemas/${cinema.cinemaId}/halls`);
            const data = res.data?.data ?? res.data ?? [];
            return (Array.isArray(data) ? data : []).map((h: any) => ({
              hallId: h.hallId,
              cinemaId: h.cinemaId,
              cinemaName: cinema.cinemaName,
              hallName: h.hallName,
              hallTypeId: h.hallTypeId,
              hallTypeName: h.hallTypeName || 'Standard',
              capacity: h.capacity || 0,
              hallCode: `H-${h.hallId}`,
              description: h.description
            } as Hall));
          } catch (e) {
            return [];
          }
        });

        const results = await Promise.all(promises);
        const allHalls = results.flat();
        setHalls(allHalls);
        if (allHalls.length > 0) {
          setSelectedHallId(allHalls[0].hallId);
          setSelectedCinemaId(allHalls[0].cinemaId);
        }
      }
    } catch (err) {
      console.error('Failed to load initial layout configs', err);
      showToast('Không thể tải cấu hình phòng chiếu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch seats of chosen hall & build layout grid
  const fetchHallSeats = async (hallId: number) => {
    if (!hallId) return;
    setLoading(true);
    try {
      const hallRes = await apiClient.get<any>(`/halls/${hallId}`);
      const hall = hallRes.data;

      const res = await apiClient.get<any[]>(`/halls/${hallId}/seats`);
      const dbSeats = res.data || [];

      let maxRowIdx = 9; // J
      let maxColIdx = 14; // 15 columns
      let parsedSeatsList: Seat[] = [];
      let parsedAisles: Aisle[] = [];

      // Check draft layout inside LocalStorage first
      const draft = localStorage.getItem(`cinema_seats_draft_${hallId}`);
      let sourceLayout: any = null;

      if (draft) {
        try {
          sourceLayout = JSON.parse(draft);
          showToast('Đã khôi phục bản nháp tự động lưu gần nhất.', 'info');
        } catch (e) { }
      }

      if (!sourceLayout && hall.description && hall.description.trim().startsWith('{')) {
        try {
          sourceLayout = JSON.parse(hall.description);
        } catch (e) {
          console.error("Failed to parse hall layout description JSON", e);
        }
      }

      if (sourceLayout && Array.isArray(sourceLayout.seats) && sourceLayout.seats.length > 0) {
        if (sourceLayout.rows) maxRowIdx = sourceLayout.rows - 1;
        if (sourceLayout.cols) maxColIdx = sourceLayout.cols - 1;
        if (Array.isArray(sourceLayout.aisles)) parsedAisles = sourceLayout.aisles;
        parsedSeatsList = sourceLayout.seats;
      } else {
        // Fallback reconstruction from DB Seats
        dbSeats.forEach((s: any) => {
          const parts = s.seatCode.split(':');
          const cleanCode = parts[0];
          const rowLetter = cleanCode.charAt(0);
          const colNum = parseInt(cleanCode.slice(1)) || 1;

          const rowIdx = getRowIndex(rowLetter);
          const colIdx = colNum - 1;

          if (rowIdx > maxRowIdx) maxRowIdx = rowIdx;
          if (colIdx > maxColIdx) maxColIdx = colIdx;

          let status: 'Available' | 'Maintenance' | 'Disabled' = 'Available';
          if (parts[1] === 'M') status = 'Maintenance';
          else if (parts[1] === 'D') status = 'Disabled';

          parsedSeatsList.push({
            id: `${rowLetter}-${colNum}`,
            row: rowLetter,
            col: colNum,
            seatCode: cleanCode,
            type: mapTypeNameToCategory(s.seatTypeName || 'Standard'),
            status: status,
            dbId: s.seatId
          });
        });
      }

      // Map back DB seatIds, codes, and statuses
      dbSeats.forEach((s: any) => {
        const parts = s.seatCode.split(':');
        const cleanCode = parts[0];
        const rowLetter = cleanCode.charAt(0);
        const colNum = parseInt(cleanCode.slice(1)) || 1;

        const match = parsedSeatsList.find(x => x.row === rowLetter && x.col === colNum);
        if (match) {
          match.dbId = s.seatId;
          match.seatCode = cleanCode;
          
          let status: 'Available' | 'Maintenance' | 'Disabled' = 'Available';
          if (parts[1] === 'M') status = 'Maintenance';
          else if (parts[1] === 'D') status = 'Disabled';
          match.status = status;
        }
      });

      // Assemble final seats mapping
      const seatsMap: { [key: string]: Seat } = {};
      parsedSeatsList.forEach(s => {
        seatsMap[s.id] = s;
      });

      setRowsCount(maxRowIdx + 1);
      setColsCount(maxColIdx + 1);
      setSeats(seatsMap);
      setAisles(parsedAisles);
      setDbSeats(dbSeats);
      setSelectedIds(new Set());
      setSelectingIds(new Set());
      setLastClickedKey(null);

      // Save initial history state
      const initialState = { seats: seatsMap, aisles: parsedAisles };
      setHistory([initialState]);
      setHistoryIndex(0);

    } catch (err) {
      console.error('Failed to load hall seat layout', err);
      showToast('Gặp lỗi khi đồng bộ sơ đồ phòng chiếu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto layout draft saver
  const triggerAutoSave = (updatedSeats: { [key: string]: Seat }, updatedAisles: Aisle[]) => {
    if (!selectedHallId) return;
    const layout = {
      rows: rowsCount,
      cols: colsCount,
      screenPosition: screenPosition,
      aisles: updatedAisles,
      sections: sections,
      seats: Object.values(updatedSeats)
    };
    localStorage.setItem(`cinema_seats_draft_${selectedHallId}`, JSON.stringify(layout));
  };

  // Push updates to state & history
  const updateLayoutState = (updatedSeats: { [key: string]: Seat }, updatedAisles: Aisle[]) => {
    setSeats(updatedSeats);
    setAisles(updatedAisles);

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push({ seats: updatedSeats, aisles: updatedAisles });
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);

    triggerAutoSave(updatedSeats, updatedAisles);
  };

  // Helper mapping helper
  const mapTypeNameToCategory = (typeName: string): SeatTypeCategory => {
    const name = typeName.toUpperCase();
    if (name.includes('VIP')) return 'VIP';
    if (name.includes('SWEETBOX') || name.includes('COUPLE') || name.includes('LOVE') || name.includes('DOUBLE') || name.includes('ĐÔI')) return 'Couple';
    if (name.includes('DISABLED')) return 'Disabled';
    return 'Standard';
  };





  // Wheel zoom listener (non-passive to allow preventDefault)
  useEffect(() => {
    const canvas = canvasContainerRef.current;
    if (!canvas) return;

    const handleWheelRaw = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoom(prev => Math.min(2.5, prev + 0.08));
      } else {
        setZoom(prev => Math.max(0.4, prev - 0.08));
      }
    };

    canvas.addEventListener('wheel', handleWheelRaw, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheelRaw);
    };
  }, []);

  // Drag canvas panning start
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return;

    if (activeMode === 'pan' || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX - panX, y: e.clientY - panY };
      return;
    }

    if (activeMode === 'select' && canvasContainerRef.current) {
      const target = e.target as HTMLElement;
      const isSeatClick = target.closest('.seat-element');
      if (!isSeatClick) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        const startX = e.clientX - rect.left;
        const startY = e.clientY - rect.top;
        setMarqueeStart({
          x: startX,
          y: startY,
          clientRealX: e.clientX,
          clientRealY: e.clientY
        });
        setMarqueeCurrent({ x: startX, y: startY });

        const isModifierPressed = e.shiftKey || e.ctrlKey || e.metaKey;
        if (!isModifierPressed) {
          setSelectedIds(new Set());
        }
      }
    }
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        setPanX(e.clientX - panStart.current.x);
        setPanY(e.clientY - panStart.current.y);
        return;
      }

      if (marqueeStart && canvasContainerRef.current) {
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const currentX = e.clientX - containerRect.left;
        const currentY = e.clientY - containerRect.top;
        setMarqueeCurrent({ x: currentX, y: currentY });

        const dx = e.clientX - marqueeStart.clientRealX;
        const dy = e.clientY - marqueeStart.clientRealY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
          setIsSelecting(true);

          const selLeft = Math.min(marqueeStart.clientRealX, e.clientX);
          const selRight = Math.max(marqueeStart.clientRealX, e.clientX);
          const selTop = Math.min(marqueeStart.clientRealY, e.clientY);
          const selBottom = Math.max(marqueeStart.clientRealY, e.clientY);

          const intersectingKeys = new Set<string>();
          const seatElements = canvasContainerRef.current.querySelectorAll('.seat-element');

          seatElements.forEach(el => {
            const key = el.getAttribute('data-key');
            if (!key) return;

            const rect = el.getBoundingClientRect();
            const overlap = !(
              rect.right < selLeft ||
              rect.left > selRight ||
              rect.bottom < selTop ||
              rect.top > selBottom
            );

            if (overlap) {
              intersectingKeys.add(key);
            }
          });
          setSelectingIds(intersectingKeys);
        }
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
      }

      if (marqueeStart) {
        if (isSelecting) {
          setSelectedIds(prev => {
            const next = new Set(prev);
            selectingIds.forEach(id => next.add(id));
            return next;
          });
          setSelectingIds(new Set());
          setIsSelecting(false);
        } else {
          const isModifierPressed = e.shiftKey || e.ctrlKey || e.metaKey;
          const target = e.target as HTMLElement;
          const clickedEmptyBackground = target === canvasContainerRef.current || target.classList.contains('canvas-viewport') || target.closest('.canvas-viewport');
          
          if (!isModifierPressed && clickedEmptyBackground) {
            setSelectedIds(new Set());
            setLastClickedKey(null);
          }
        }
        setMarqueeStart(null);
        setMarqueeCurrent(null);
      }
    };

    if (isPanning || marqueeStart) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isPanning, marqueeStart, isSelecting, selectingIds]);

  const getSeatCountForType = (frontEndType: SeatTypeCategory | 'Aisle') => {
    const cellCount = Object.values(seats).filter(s => {
      const rowIdx = getRowIndex(s.row);
      if (rowIdx >= rowsCount || s.col > colsCount) return false;

      const isHorizAisle = aisles.some(a => a.type === 'horizontal' && a.index === rowIdx);
      const isVertAisle = aisles.some(a => a.type === 'vertical' && a.index === s.col);
      const isAisle = isHorizAisle || isVertAisle || s.type === 'Aisle';

      if (frontEndType === 'Aisle') {
        return isAisle;
      } else {
        return s.type === frontEndType && !isAisle;
      }
    }).length;

    if (frontEndType === 'Couple') {
      return Math.ceil(cellCount / 2);
    }
    return cellCount;
  };

  const handleSelectTool = (tool: SeatTypeCategory | 'Aisle' | 'Empty' | 'Pointer') => {
    setActiveDrawingTool(tool);
    if (tool === 'Pointer') return;

    if (selectedIds.size > 0) {
      if (tool === 'Empty') {
        handleClearSelectedSeats();
      } else {
        handleBulkChangeType(tool);
      }
    }
  };

  const handleAddSeatType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    try {
      await apiClient.post('/seattypes', {
        typeName: newTypeName.trim(),
        priceMultiplier: newPriceMultiplier
      });
      showToast('Thêm loại ghế thành công.', 'success');
      setIsAddTypeOpen(false);
      setNewTypeName('');
      setNewPriceMultiplier(1.0);
      fetchMetadata();
    } catch (error: any) {
      console.error(error);
      showToast('Không thể thêm loại ghế.', 'error');
    }
  };

  // Helper to set type of a seat and auto-manage couple seat pairing
  const setSeatTypeAndPair = useCallback((
    nextSeats: { [key: string]: Seat },
    row: string,
    col: number,
    type: SeatTypeCategory | 'Aisle' | 'Empty',
    status: 'Available' | 'Maintenance' | 'Disabled' = 'Available'
  ) => {
    const key = `${row}-${col}`;

    if (type === 'Empty') {
      delete nextSeats[key];
    } else {
      nextSeats[key] = {
        id: key,
        row,
        col,
        seatCode: `${row}${col}`,
        type: type,
        status
      };
    }
  }, []);

  // Interactive mouse click on a seat
  const handleSeatClick = useCallback((row: string, col: number, e: React.MouseEvent) => {
    if (activeMode === 'pan') return;

    const key = `${row}-${col}`;

    // Ctrl/Meta: toggle ghế vào selection
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      setLastClickedKey(key);
      return;
    }

    // Shift + click (không kéo): range select
    if (e.shiftKey && lastClickedKey) {
      const startSeat = seats[lastClickedKey];
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (startSeat) {
          const startRowIdx = getRowIndex(startSeat.row);
          const endRowIdx = getRowIndex(row);
          const minRow = Math.min(startRowIdx, endRowIdx);
          const maxRow = Math.max(startRowIdx, endRowIdx);
          const minCol = Math.min(startSeat.col, col);
          const maxCol = Math.max(startSeat.col, col);
          for (let r = minRow; r <= maxRow; r++) {
            const rowLetter = getRowLetter(r);
            for (let c = minCol; c <= maxCol; c++) {
              const k = `${rowLetter}-${c}`;
              if (seats[k]) next.add(k);
            }
          }
        }
        return next;
      });
      setLastClickedKey(key);
      return;
    }

    // Shift + click không có lastClickedKey: chọn ghế này làm điểm đầu
    if (e.shiftKey) {
      setSelectedIds(new Set([key]));
      setLastClickedKey(key);
      return;
    }

    // Pointer select mode: click to select + open editor modal
    if (activeDrawingTool === 'Pointer') {
      const isModifierPressed = e.shiftKey || e.ctrlKey || e.metaKey;
      
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (isModifierPressed) {
          if (next.has(key)) next.delete(key);
          else next.add(key);
        } else {
          next.clear();
          next.add(key);
        }
        return next;
      });
      setLastClickedKey(key);

      if (!isModifierPressed) {
        const seat = seats[key];
        setEditingSeatKey(key);
        setEditSeatCode(seat ? seat.seatCode : `${row}${col}`);
        setEditSeatType(seat ? seat.type : 'Empty');
        setEditSeatStatus(seat ? seat.status : 'Available');
        setEditDbId(seat ? seat.dbId : undefined);
      }
      return;
    }

    // Đang có ghế được chọn: click thường chỉ select/deselect, không vẽ
    if (selectedIds.size > 0) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else { next.clear(); next.add(key); }
        return next;
      });
      setLastClickedKey(key);
      return;
    }

    // Không có gì được chọn: chế độ vẽ bình thường
    if (activeDrawingTool === 'Couple') {
      if (!coupleFirstSeat) {
        const isVertAisle = aisles.some(a => a.type === 'vertical' && a.index === col);
        const isHorizAisle = aisles.some(a => a.type === 'horizontal' && a.index === getRowIndex(row));
        if (isVertAisle || isHorizAisle) { showToast('Không thể chọn lối đi làm ghế đôi.', 'warning'); return; }
        setCoupleFirstSeat({ row, col });
        showToast(`Đã chọn ghế đầu ${row}${col}. Chọn ghế tiếp theo cạnh bên để ghép đôi.`, 'info');
      } else {
        const start = coupleFirstSeat;
        if (start.row === row && start.col === col) { setCoupleFirstSeat(null); showToast('Đã hủy chọn ghế.', 'info'); return; }
        if (start.row !== row) {
          const isVertAisle = aisles.some(a => a.type === 'vertical' && a.index === col);
          const isHorizAisle = aisles.some(a => a.type === 'horizontal' && a.index === getRowIndex(row));
          if (isVertAisle || isHorizAisle) { showToast('Không thể chọn lối đi làm ghế đôi.', 'warning'); return; }
          setCoupleFirstSeat({ row, col }); showToast(`Thay đổi ghế đầu thành ${row}${col}.`, 'info'); return;
        }
        if (Math.abs(start.col - col) !== 1) {
          const isVertAisle = aisles.some(a => a.type === 'vertical' && a.index === col);
          const isHorizAisle = aisles.some(a => a.type === 'horizontal' && a.index === getRowIndex(row));
          if (isVertAisle || isHorizAisle) { showToast('Không thể chọn lối đi làm ghế đôi.', 'warning'); return; }
          setCoupleFirstSeat({ row, col }); showToast(`Thay đổi ghế đầu thành ${row}${col}.`, 'info'); return;
        }
        const isAisle1 = aisles.some(a => (a.type === 'vertical' && a.index === start.col) || (a.type === 'horizontal' && a.index === getRowIndex(row)));
        const isAisle2 = aisles.some(a => (a.type === 'vertical' && a.index === col) || (a.type === 'horizontal' && a.index === getRowIndex(row)));
        if (isAisle1 || isAisle2) { showToast('Không thể ghép cặp lối đi.', 'warning'); return; }
        const nextSeats = { ...seats };
        const nextAisles = [...aisles];
        const key1 = `${row}-${start.col}`;
        const key2 = `${row}-${col}`;
        nextSeats[key1] = { id: key1, row, col: start.col, seatCode: `${row}${start.col}`, type: 'Couple', status: 'Available' };
        nextSeats[key2] = { id: key2, row, col, seatCode: `${row}${col}`, type: 'Couple', status: 'Available' };
        updateLayoutState(nextSeats, nextAisles);
        setCoupleFirstSeat(null);
        showToast(`Đã ghép cặp ghế đôi ${row}${Math.min(start.col, col)} và ${row}${Math.max(start.col, col)}.`, 'success');
      }
      return;
    }

    const nextSeats = { ...seats };
    const nextAisles = [...aisles];
    setSeatTypeAndPair(nextSeats, row, col, activeDrawingTool === 'Empty' ? 'Empty' : activeDrawingTool);
    updateLayoutState(nextSeats, nextAisles);
  }, [activeMode, lastClickedKey, selectedIds, seats, aisles, activeDrawingTool, coupleFirstSeat, showToast, setSeatTypeAndPair, updateLayoutState]);

  // Marquee drag start / Couple drag start
  const handleSeatMouseDown = useCallback((_row: string, _col: number, e: React.MouseEvent) => {
    if (activeMode === 'pan' || e.button !== 0) return;
    if (activeDrawingTool === 'Couple') return;

    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      setMarqueeStart({
        x: startX,
        y: startY,
        clientRealX: e.clientX,
        clientRealY: e.clientY
      });
      setMarqueeCurrent({ x: startX, y: startY });

      const isModifierPressed = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!isModifierPressed) {
        // Clear selection on click-down to start fresh marquee selection
        setSelectedIds(new Set());
      }
    }
  }, [activeMode, activeDrawingTool]);

  // Marquee mouse enter (no-op now since window mousemove does the math)
  const handleSeatMouseEnter = useCallback((_row: string, _col: number) => {
    // Managed via window level mousemove
  }, []);

  // Multi-seat HTML5 Drag & Drop movement
  const handleDragStart = useCallback((key: string, e: React.DragEvent) => {
    if (activeMode === 'pan') {
      e.preventDefault();
      return;
    }
    const dragPayload = {
      draggedKey: key,
      selectedKeys: selectedIds.has(key) ? Array.from(selectedIds) : [key]
    };
    e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
    e.dataTransfer.effectAllowed = 'move';
  }, [activeMode, selectedIds]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((targetKey: string, e: React.DragEvent) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const payload = JSON.parse(dataStr);
      const { draggedKey, selectedKeys } = payload;

      const sourceSeat = seats[draggedKey];
      const targetSeatPos = targetKey.split('-');
      const targetRow = targetSeatPos[0];
      const targetCol = parseInt(targetSeatPos[1]);

      if (!sourceSeat) return;

      const rowDiff = getRowIndex(targetRow) - getRowIndex(sourceSeat.row);
      const colDiff = targetCol - sourceSeat.col;

      const nextSeats = { ...seats };
      const tempMovedSeats: Seat[] = [];

      // Determine destinations
      for (const key of selectedKeys) {
        const currentSeat = seats[key];
        if (currentSeat) {
          const newRowIdx = getRowIndex(currentSeat.row) + rowDiff;
          const newCol = currentSeat.col + colDiff;

          if (newRowIdx >= 0 && newRowIdx < rowsCount && newCol > 0 && newCol <= colsCount) {
            const destKey = `${getRowLetter(newRowIdx)}-${newCol}`;
            tempMovedSeats.push({
              ...currentSeat,
              id: destKey,
              row: getRowLetter(newRowIdx),
              col: newCol
            });
            delete nextSeats[key];
          }
        }
      }

      // Merge and place
      tempMovedSeats.forEach(s => {
        nextSeats[s.id] = s;
      });

      updateLayoutState(nextSeats, aisles);
      setSelectedIds(new Set(tempMovedSeats.map(s => s.id)));
      showToast(`Đã di dời ${tempMovedSeats.length} ghế thành công.`, 'success');

    } catch (e) {
      console.error(e);
    }
  }, [seats, aisles, rowsCount, colsCount]);

  // Bulk Edit seat category type
  const handleBulkChangeType = (newType: SeatTypeCategory | 'Aisle') => {
    if (selectedIds.size === 0) {
      showToast('Vui lòng chọn các ghế để thay đổi.', 'warning');
      return;
    }

    const nextSeats = { ...seats };
    selectedIds.forEach(key => {
      const [row, colStr] = key.split('-');
      const col = parseInt(colStr);
      if (row && !isNaN(col)) {
        setSeatTypeAndPair(nextSeats, row, col, newType);
      }
    });

    updateLayoutState(nextSeats, aisles);
    showToast(`Đã chuyển ${selectedIds.size} ghế sang loại ${newType}.`, 'success');
  };



  // Delete/Clear selected seats (converts them back to Empty space layout slots)
  const handleClearSelectedSeats = () => {
    if (selectedIds.size === 0) return;

    const nextSeats = { ...seats };
    selectedIds.forEach(key => {
      const [row, colStr] = key.split('-');
      const col = parseInt(colStr);
      if (row && !isNaN(col)) {
        setSeatTypeAndPair(nextSeats, row, col, 'Empty');
      }
    });

    updateLayoutState(nextSeats, aisles);
    setSelectedIds(new Set());
    showToast(`Đã xóa ${selectedIds.size} vị trí ghế trên sơ đồ.`, 'info');
  };

  // Save single seat changes from editor modal popup
  const handleSaveSingleSeat = () => {
    if (!editingSeatKey) return;
    const [row, colStr] = editingSeatKey.split('-');
    const col = parseInt(colStr);

    const nextSeats = { ...seats };
    const nextAisles = [...aisles];

    if (editSeatType === 'Empty') {
      delete nextSeats[editingSeatKey];
    } else {
      nextSeats[editingSeatKey] = {
        id: editingSeatKey,
        row,
        col,
        seatCode: editSeatCode.trim(),
        type: editSeatType,
        status: editSeatStatus,
        dbId: editDbId
      };
    }

    updateLayoutState(nextSeats, nextAisles);
    setEditingSeatKey(null);
    showToast(`Đã cập nhật cấu hình ghế ${row}${col}.`, 'success');
  };

  // Bulk Edit seat status
  const handleBulkChangeStatus = (newStatus: 'Available' | 'Maintenance' | 'Disabled') => {
    if (selectedIds.size === 0) {
      showToast('Vui lòng chọn các ghế để thay đổi.', 'warning');
      return;
    }

    const nextSeats = { ...seats };
    selectedIds.forEach(key => {
      const seat = nextSeats[key];
      if (seat) {
        nextSeats[key] = {
          ...seat,
          status: newStatus
        };
      }
    });

    updateLayoutState(nextSeats, aisles);
    showToast(`Đã chuyển trạng thái ${selectedIds.size} ghế sang ${newStatus === 'Available' ? 'Hoạt động' : newStatus === 'Maintenance' ? 'Bảo trì' : 'Khóa'}.`, 'success');
  };

  // Toggle Aisle walkways
  const handleToggleAisle = (type: 'vertical' | 'horizontal', index: number) => {
    const exists = aisles.find(a => a.type === type && a.index === index);
    let nextAisles: Aisle[] = [];

    if (exists) {
      nextAisles = aisles.filter(a => !(a.type === type && a.index === index));
      showToast(`Đã xóa lối đi ${type === 'vertical' ? 'dọc cột' : 'ngang hàng'} ${index}.`, 'info');
    } else {
      nextAisles = [...aisles, { type, index }];
      showToast(`Đã thêm lối đi ${type === 'vertical' ? 'dọc cột' : 'ngang hàng'} ${index}.`, 'success');
    }

    updateLayoutState(seats, nextAisles);
  };

  // Automatic Re-indexing seat numbering row-by-row
  const handleAutoReIndex = () => {
    const nextSeats = { ...seats };

    for (let r = 0; r < rowsCount; r++) {
      const rowLetter = getRowLetter(r);
      let physicalSeatNumber = 1;

      for (let c = 1; c <= colsCount; c++) {
        // Skip vertical columns if marked as aisles
        const isVertAisle = aisles.some(a => a.type === 'vertical' && a.index === c);
        const isHorizAisle = aisles.some(a => a.type === 'horizontal' && a.index === r);
        if (isVertAisle || isHorizAisle) continue;

        const key = `${rowLetter}-${c}`;
        const seat = nextSeats[key];

        if (seat) {
          nextSeats[key] = {
            ...seat,
            seatCode: `${rowLetter}${physicalSeatNumber}`
          };
          physicalSeatNumber++;
        }
      }
    }

    updateLayoutState(nextSeats, aisles);
    showToast('Đã đánh lại mã ghế tự động liên tục.', 'success');
  };

  // Copy-Paste layouts clipboard helpers
  const handleCopyLayout = () => {
    if (selectedIds.size === 0) {
      showToast('Vui lòng chọn các ghế để copy.', 'warning');
      return;
    }
    const clipData: { [key: string]: Seat } = {};
    selectedIds.forEach(key => {
      if (seats[key]) {
        clipData[key] = seats[key];
      }
    });
    setClipboard(clipData);
    showToast(`Đã copy ${selectedIds.size} ghế vào clipboard thiết kế.`, 'success');
  };

  const handlePasteLayout = () => {
    if (!clipboard) {
      showToast('Không có dữ liệu copy trong bộ nhớ tạm.', 'warning');
      return;
    }

    const nextSeats = { ...seats };
    Object.values(clipboard).forEach(s => {
      // Offset position or paste exactly
      nextSeats[s.id] = {
        ...s,
        dbId: undefined // Reset dbId for duplicate/pasted items
      };
    });

    updateLayoutState(nextSeats, aisles);
    showToast(`Đã dán ${Object.keys(clipboard).length} ghế.`, 'success');
  };

  // Calculations for Seat stats counters
  const stats = useMemo(() => {
    let standard = 0;
    let vip = 0;
    let coupleCells = 0;
    let disabled = 0;

    Object.values(seats).forEach(s => {
      const rowIdx = getRowIndex(s.row);
      if (rowIdx < rowsCount && s.col <= colsCount) {
        const isHorizAisle = aisles.some(a => a.type === 'horizontal' && a.index === rowIdx);
        const isVertAisle = aisles.some(a => a.type === 'vertical' && a.index === s.col);
        const isAisle = isHorizAisle || isVertAisle || s.type === 'Aisle';

        if (!isAisle) {
          if (s.type === 'Standard') {
            standard++;
          } else if (s.type === 'VIP') {
            vip++;
          } else if (s.type === 'Couple') {
            coupleCells++;
          } else if (s.type === 'Disabled') {
            disabled++;
          }
        }
      }
    });

    const couple = Math.ceil(coupleCells / 2);
    const total = standard + vip + couple + disabled;

    return { total, standard, vip, couple, disabled };
  }, [seats, aisles, rowsCount, colsCount]);

  // Design validation warnings lists
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];
    const codeSet = new Set<string>();

    // Only validate seats within the current bounds that are not aisles or empty
    const activeSeats = Object.values(seats).filter(s => {
      const rowIdx = getRowIndex(s.row);
      if (rowIdx >= rowsCount || s.col > colsCount) return false;

      const isHorizAisle = aisles.some(a => a.type === 'horizontal' && a.index === rowIdx);
      const isVertAisle = aisles.some(a => a.type === 'vertical' && a.index === s.col);
      const isAisle = isHorizAisle || isVertAisle || s.type === 'Aisle';

      return !isAisle;
    });

    // Check duplicate codes
    activeSeats.forEach(s => {
      if (codeSet.has(s.seatCode)) {
        warnings.push(`Ghế trùng mã: Mã ${s.seatCode} xuất hiện nhiều lần.`);
      }
      codeSet.add(s.seatCode);
    });

    // Check Sweetbox layout pairing
    const validatedRows = new Set<string>();
    activeSeats.forEach(s => {
      if (validatedRows.has(s.row)) return;
      validatedRows.add(s.row);

      const { unpaired } = getRowCouplePairs(s.row);
      unpaired.forEach(col => {
        const key = `${s.row}-${col}`;
        const seat = seats[key];
        if (seat) {
          warnings.push(`Ghế Sweetbox đơn lẻ: ${seat.seatCode} không tạo thành cặp.`);
        }
      });
    });

    return warnings;
  }, [seats, aisles, rowsCount, colsCount, getRowCouplePairs]);

  // Export layout overrides to requested JSON scheme
  const handleExportJson = () => {
    const activeSeatsList = Object.values(seats).filter(s => {
      const rowIdx = getRowIndex(s.row);
      return rowIdx < rowsCount && s.col <= colsCount;
    });

    const activeAisles = aisles.filter(a => {
      if (a.type === 'vertical') return a.index <= colsCount;
      return a.index < rowsCount;
    });

    const layout: SeatLayout = {
      rows: rowsCount,
      cols: colsCount,
      screenPosition: 'TOP',
      aisles: activeAisles,
      sections: sections,
      seats: activeSeatsList
    };

    const text = JSON.stringify(layout, null, 2);
    setJsonText(text);
    setIsJsonOpen(true);
  };

  // Import layout overrides from JSON scheme
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as SeatLayout;
      if (typeof parsed.rows !== 'number' || typeof parsed.cols !== 'number') {
        showToast('JSON cấu trúc sai. Phải chứa rows và cols.', 'error');
        return;
      }

      setRowsCount(parsed.rows);
      setColsCount(parsed.cols);
      setAisles(parsed.aisles || []);

      const newSeatsMap: { [key: string]: Seat } = {};
      if (Array.isArray(parsed.seats)) {
        parsed.seats.forEach((s: any) => {
          newSeatsMap[s.id] = {
            id: s.id,
            row: s.row,
            col: s.col,
            seatCode: s.seatCode || `${s.row}${s.col}`,
            type: s.type || 'Standard',
            status: s.status || 'Available',
            dbId: s.dbId
          };
        });
      }

      setSeats(newSeatsMap);
      setIsJsonOpen(false);
      setSelectedIds(new Set());
      showToast('Đã nhập và áp dụng cấu hình JSON thành công.', 'success');
    } catch (e) {
      showToast('Định dạng JSON không hợp lệ.', 'error');
    }
  };

  // Helper mapping to DB SeatTypeId
  const getDbSeatTypeId = (frontendType: SeatTypeCategory): number => {
    const match = dbSeatTypes.find(t => {
      const name = t.typeName.toUpperCase();
      if (frontendType === 'VIP' && name.includes('VIP')) return true;
      if (frontendType === 'Couple' && (name.includes('SWEETBOX') || name.includes('COUPLE') || name.includes('LOVE') || name.includes('DOUBLE') || name.includes('ĐÔI'))) return true;
      if (frontendType === 'Disabled' && name.includes('DISABLED')) return true;
      if (frontendType === 'Standard' && (name.includes('STANDARD') || name.includes('THƯỜNG') || name.includes('TIÊU CHUẨN'))) return true;
      return false;
    });

    return match ? match.seatTypeId : (dbSeatTypes[0]?.seatTypeId || 1);
  };

  // Save changes to database (persists layout JSON inside Hall Description column & syncs Seats CRUD)
  const handleSaveToDatabase = async () => {
    if (!selectedHallId) {
      showToast('Vui lòng chọn phòng chiếu trước.', 'warning');
      return;
    }

    if (validationWarnings.length > 0) {
      showToast('Vui lòng khắc phục các cảnh báo trước khi lưu sơ đồ.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const hallRes = await apiClient.get<any>(`/halls/${selectedHallId}`);
      const hall = hallRes.data;

      const dbSeatsRes = await apiClient.get<any[]>(`/halls/${selectedHallId}/seats`);
      const dbSeats = dbSeatsRes.data || [];

      // Track DB items changes
      const toDeleteIds: number[] = [];
      const toUpdate: { seatId: number; seatCode: string; seatTypeId: number }[] = [];
      const toCreate: { hallId: number; seatCode: string; seatTypeId: number }[] = [];

      // Mark DB physical seats as deleted if they are not in the active seats list, are Aisle cells, OR are outside the new bounds
      dbSeats.forEach((d: any) => {
        const cleanCode = d.seatCode.split(':')[0];
        const rowLetter = cleanCode.charAt(0);
        const colNum = parseInt(cleanCode.slice(1)) || 1;
        const key = `${rowLetter}-${colNum}`;
        const rowIdx = getRowIndex(rowLetter);

        const isHorizAisle = aisles.some(a => a.type === 'horizontal' && a.index === rowIdx);
        const isVertAisle = aisles.some(a => a.type === 'vertical' && a.index === colNum);
        const isAisle = isHorizAisle || isVertAisle || (seats[key]?.type === 'Aisle');

        if (!seats[key] || isAisle || rowIdx >= rowsCount || colNum > colsCount) {
          toDeleteIds.push(d.seatId);
        }
      });

      // Filter seats list to match current grid dimensions only (this includes Aisle for layoutJson)
      const activeSeatsList = Object.values(seats).filter(s => {
        const rowIdx = getRowIndex(s.row);
        return rowIdx < rowsCount && s.col <= colsCount;
      });

      // DB sync list excludes Aisle/walkway cells
      const dbSeatsList = activeSeatsList.filter(s => {
        const rowIdx = getRowIndex(s.row);
        const isHorizAisle = aisles.some(a => a.type === 'horizontal' && a.index === rowIdx);
        const isVertAisle = aisles.some(a => a.type === 'vertical' && a.index === s.col);
        const isAisle = isHorizAisle || isVertAisle || s.type === 'Aisle';
        return !isAisle;
      });

      // Scan layout grid cells within bounds to find what to update or create
      dbSeatsList.forEach(visualCell => {
        let rawCode = visualCell.row + visualCell.col;
        if (visualCell.status === 'Maintenance') rawCode += ':M';
        else if (visualCell.status === 'Disabled') rawCode += ':D';
        else if (visualCell.type === 'Disabled') rawCode += ':D';

        const typeId = getDbSeatTypeId(visualCell.type as SeatTypeCategory);

        const dbMatch = dbSeats.find((d: any) => {
          if (visualCell.dbId && d.seatId === visualCell.dbId) return true;
          const cleanCode = d.seatCode.split(':')[0];
          return cleanCode === (visualCell.row + visualCell.col);
        });

        if (dbMatch) {
          if (dbMatch.seatCode !== rawCode || dbMatch.seatTypeId !== typeId) {
            toUpdate.push({
              seatId: dbMatch.seatId,
              seatCode: rawCode,
              seatTypeId: typeId
            });
          }
        } else {
          toCreate.push({
            hallId: selectedHallId,
            seatCode: rawCode,
            seatTypeId: typeId
          });
        }
      });

      // Filter aisles within the current bounds
      const activeAisles = aisles.filter(a => {
        if (a.type === 'vertical') return a.index <= colsCount;
        return a.index < rowsCount;
      });

      // Save structural description JSON config containing only active seats/aisles
      let originalMetadata: any = {};
      if (hall.description && hall.description.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(hall.description);
          originalMetadata = {
            status: parsed.status,
            hallCode: parsed.hallCode,
            createdAt: parsed.createdAt,
            description: parsed.description,
            supportedFormats: parsed.supportedFormats
          };
        } catch (e) {}
      }

      const layoutJson = JSON.stringify({
        rows: rowsCount,
        cols: colsCount,
        screenPosition: screenPosition,
        aisles: activeAisles,
        sections: sections,
        seats: activeSeatsList,
        ...originalMetadata
      });

      await apiClient.put(`/halls/${selectedHallId}`, {
        hallName: hall.hallName,
        hallTypeId: hall.hallTypeId,
        capacity: stats.total,
        description: layoutJson
      });

      // Sync physical database tables
      const batchSize = 15;

      // Create new seats
      for (let i = 0; i < toCreate.length; i += batchSize) {
        const batch = toCreate.slice(i, i + batchSize);
        await Promise.all(batch.map(s => apiClient.post('/seats', s)));
      }

      // Update changed seats
      for (let i = 0; i < toUpdate.length; i += batchSize) {
        const batch = toUpdate.slice(i, i + batchSize);
        await Promise.all(batch.map(s => apiClient.put(`/seats/${s.seatId}`, {
          seatCode: s.seatCode,
          seatTypeId: s.seatTypeId
        })));
      }

      // Delete/Unlink removed seats
      for (let i = 0; i < toDeleteIds.length; i += batchSize) {
        const batch = toDeleteIds.slice(i, i + batchSize);
        await Promise.all(batch.map(id => apiClient.delete(`/seats/${id}`)));
      }

      localStorage.removeItem(`cinema_seats_draft_${selectedHallId}`); // Clear draft on successful save
      showToast('Đã lưu cấu hình sơ đồ JSON Layout và đồng bộ vào DB thành công!', 'success');

      fetchHallSeats(selectedHallId);

    } catch (err: any) {
      console.error('Failed to sync seat layout with server', err);
      const msg = err.response?.data?.message || 'Không thể đồng bộ sơ đồ phòng chiếu.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Curved layout math transformations
  const getCurveTransformation = (col: number) => {
    if (curveStrength === 0) return { yOffset: 0, rotation: 0 };
    const centerCol = (colsCount + 1) / 2;
    const dist = col - centerCol;
    const yOffset = Math.pow(dist, 2) * curveStrength * 0.45;
    const rotation = dist * curveStrength * 0.95;
    return { yOffset, rotation };
  };

  return (
    <div className="flex flex-col animate-fadeIn w-full text-left text-slate-100 bg-[#0f172a] rounded-3xl border border-slate-850 shadow-2xl overflow-hidden select-none">

      {/* 1. Header Panel */}
      <div className="bg-purple-950/20 border-b border-slate-850 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 text-white p-2.5 rounded-xl shadow-md">
            <Grid size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-purple-350 tracking-tight">
              Thiết kế bố cục ghế ngồi
            </h3>
            <span className="text-[11px] text-purple-400/80 font-medium block mt-0.5">
              06 - Click để thêm dãy, nhập số ghế đôi, kéo thả cho lối đi
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-slate-900 border border-slate-800 px-3.5 py-1 rounded-full text-xs font-bold text-purple-355 shadow-sm">
            Tổng: {stats.total} ghế
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1.5 text-purple-400 hover:text-purple-300 transition-colors rounded-full hover:bg-slate-800/50 cursor-pointer"
            title="Bỏ chọn tất cả"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Dev & Advanced Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#111827] border-b border-slate-850 px-6 shadow-sm">

        {/* Cinema Selection dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Rạp Chiếu:</span>
          <select
            value={selectedCinemaId}
            onChange={(e) => {
              const cinemaId = parseInt(e.target.value) || 0;
              setSelectedCinemaId(cinemaId);
              const firstHall = halls.find(h => h.cinemaId === cinemaId);
              if (firstHall) {
                setSelectedHallId(firstHall.hallId);
              }
            }}
            className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 rounded-xl focus:outline-none focus:border-purple-500 min-w-[180px]"
          >
            <option value={0} disabled>Chọn rạp chiếu</option>
            {uniqueCinemas.map((c) => (
              <option key={c.cinemaId} value={c.cinemaId}>{c.cinemaName}</option>
            ))}
          </select>
        </div>

        {/* Hall Selection dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Phòng Chiếu:</span>
          <select
            value={selectedHallId}
            onChange={(e) => setSelectedHallId(parseInt(e.target.value) || 0)}
            className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 rounded-xl focus:outline-none focus:border-purple-500 min-w-[150px]"
          >
            <option value={0} disabled>Chọn phòng chiếu</option>
            {filteredHalls.map((h) => (
              <option key={h.hallId} value={h.hallId}>{h.hallName}</option>
            ))}
          </select>
        </div>

        {/* Viewport Mode / Zoom Controls */}
        <div className="flex items-center gap-3.5">
          <div className="flex bg-slate-955 p-0.5 rounded-xl border border-slate-850 items-center">
            <button
              onClick={() => setActiveMode('select')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${activeMode === 'select' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <MousePointer size={12} /> Chọn
            </button>
            <button
              onClick={() => setActiveMode('pan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${activeMode === 'pan' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Hand size={12} /> Dịch
            </button>
          </div>

          <div className="flex items-center border border-slate-850 rounded-xl bg-slate-955 p-0.5">
            <button onClick={() => handleZoom('out')} className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-250 cursor-pointer" title="Zoom Out">
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-bold font-mono px-2 text-slate-350 w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
            <button onClick={() => handleZoom('in')} className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-250 cursor-pointer" title="Zoom In">
              <ZoomIn size={13} />
            </button>
            <button onClick={() => handleZoom('reset')} className="p-1.5 hover:bg-slate-850 rounded-lg text-purple-400 cursor-pointer ml-1 border-l border-slate-850 pl-2" title="Reset Camera">
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Undo/Redo/Copy/Paste/JSON layout ops */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-xl cursor-pointer border border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-850 disabled:opacity-30"
            title="Undo (Ctrl + Z)"
          >
            <Undo2 size={13} />
          </Button>
          <Button
            variant="secondary"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-xl cursor-pointer border border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-850 disabled:opacity-30"
            title="Redo (Ctrl + Y)"
          >
            <Redo2 size={13} />
          </Button>
          <Button
            variant="secondary"
            onClick={handleCopyLayout}
            className="p-2 rounded-xl cursor-pointer border border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-850"
            title="Copy Layout"
          >
            <Copy size={13} />
          </Button>
          <Button
            variant="secondary"
            onClick={handlePasteLayout}
            disabled={!clipboard}
            className="p-2 rounded-xl cursor-pointer border border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-850 disabled:opacity-30"
            title="Paste Layout"
          >
            <Clipboard size={13} />
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl cursor-pointer border border-slate-850 text-purple-300 bg-purple-950/40 hover:bg-purple-900/30"
          >
            <Download size={13} /> Xuất JSON
          </Button>
        </div>
      </div>

      {/* 2. Workspace Layout */}
      <div className="flex flex-col xl:flex-row items-stretch w-full min-h-[650px] bg-[#090d16]">

        {/* Left Sidebar controls */}
        <div className="w-full xl:w-80 bg-[#111827] border-r border-slate-850 p-6 flex flex-col gap-6 text-left shrink-0">

          {/* Grid Size Section */}
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-4">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Grid size={13} /> Kích thước lưới
            </span>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-350 flex justify-between">
                  <span>Số hàng</span>
                  <span className="text-purple-405 font-mono font-bold">{rowsCount}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={26}
                  value={rowsCount}
                  onChange={(e) => setRowsCount(parseInt(e.target.value) || 10)}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-350 flex justify-between">
                  <span>Số cột</span>
                  <span className="text-purple-405 font-mono font-bold">{colsCount}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={colsCount}
                  onChange={(e) => setColsCount(parseInt(e.target.value) || 10)}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Add Seat Type Button */}
          <button
            onClick={() => setIsAddTypeOpen(true)}
            className="w-full py-2.5 bg-purple-950/40 hover:bg-purple-900/30 border border-purple-900/40 text-purple-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Thêm loại ghế
          </button>

          {/* Drawing Tools Section */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Công cụ vẽ
            </span>

            <div className="flex flex-col gap-2">
              {/* Pointer tool */}
              <div
                onClick={() => handleSelectTool('Pointer')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${activeDrawingTool === 'Pointer'
                    ? 'border-purple-500 bg-purple-950/20 ring-2 ring-purple-900/50'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-4 w-4 rounded bg-purple-800 border border-purple-700 flex items-center justify-center shrink-0">
                    <MousePointer size={10} className="text-purple-200" />
                  </span>
                  <span className="text-xs font-bold text-slate-200">Chọn & Chỉnh sửa</span>
                </div>
              </div>

              {/* Standard tool */}
              <div
                onClick={() => handleSelectTool('Standard')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${activeDrawingTool === 'Standard'
                    ? 'border-purple-500 bg-purple-950/20 ring-2 ring-purple-900/50'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-[#7c3aed] shrink-0" />
                  <span className="text-xs font-bold text-slate-200">Standard - {getSeatCountForType('Standard')} Ghế</span>
                </div>
                <div className="text-slate-500 hover:text-slate-450 p-0.5">
                  <MoreVertical size={13} />
                </div>
              </div>

              {/* VIP tool */}
              <div
                onClick={() => handleSelectTool('VIP')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${activeDrawingTool === 'VIP'
                    ? 'border-purple-500 bg-purple-950/20 ring-2 ring-purple-900/50'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-[#ef4444] shrink-0" />
                  <span className="text-xs font-bold text-slate-200">VIP - {getSeatCountForType('VIP')} Ghế</span>
                </div>
                <div className="text-slate-500 hover:text-slate-450 p-0.5">
                  <MoreVertical size={13} />
                </div>
              </div>

              {/* Couple tool */}
              <div
                onClick={() => handleSelectTool('Couple')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${activeDrawingTool === 'Couple'
                    ? 'border-purple-500 bg-purple-950/20 ring-2 ring-purple-900/50'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-[#ec4899] shrink-0" />
                  <span className="text-xs font-bold text-slate-200">Ghế Đôi - {getSeatCountForType('Couple')} Ghế</span>
                </div>
                <div className="text-slate-500 hover:text-slate-455 p-0.5">
                  <MoreVertical size={13} />
                </div>
              </div>

              {/* Disabled/Khóa tool */}
              <div
                onClick={() => handleSelectTool('Disabled')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${activeDrawingTool === 'Disabled'
                    ? 'border-purple-500 bg-purple-950/20 ring-2 ring-purple-900/50'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-[#f59e0b] shrink-0" />
                  <span className="text-xs font-bold text-slate-200">Khóa / Bảo Trì - {getSeatCountForType('Disabled')} Ghế</span>
                </div>
                <div className="text-slate-500 hover:text-slate-450 p-0.5">
                  <MoreVertical size={13} />
                </div>
              </div>

              {/* Aisle tool */}
              <div
                onClick={() => handleSelectTool('Aisle')}
                className={`flex items-center justify-between p-3 rounded-xl border border-dashed cursor-pointer transition-all ${activeDrawingTool === 'Aisle'
                    ? 'border-purple-500 bg-purple-950/20 ring-2 ring-purple-900/50'
                    : 'border-slate-805 hover:border-slate-700 bg-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-4 w-4 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <Footprints size={10} className="text-slate-400" />
                  </span>
                  <span className="text-xs font-bold text-slate-200">Lối Đi - {getSeatCountForType('Aisle')} Ô</span>
                </div>
              </div>

              {/* Delete tool */}
              <div
                onClick={() => handleSelectTool('Empty')}
                className={`flex items-center justify-between p-3 rounded-xl border border-dashed cursor-pointer transition-all ${activeDrawingTool === 'Empty'
                    ? 'border-purple-500 bg-purple-950/20 ring-2 ring-purple-900/50'
                    : 'border-slate-805 hover:border-slate-700 bg-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-4 w-4 rounded-full bg-red-950/30 border border-red-900/50 flex items-center justify-center shrink-0">
                    <X size={10} className="text-red-500" />
                  </span>
                  <span className="text-xs font-bold text-red-400">Xóa Ghế</span>
                </div>
              </div>
            </div>
          </div>

          {/* Curve Strength & Auto Index */}
          <div className="flex flex-col gap-3.5 border-t border-slate-800 pt-4">
            <div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-450">
                <span>Độ cong IMAX:</span>
                <span className="text-slate-200 font-mono font-bold">{curveStrength.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={0.2}
                value={curveStrength}
                onChange={(e) => setCurveStrength(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-1"
              />
            </div>

            <Button
              onClick={handleAutoReIndex}
              variant="secondary"
              className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl cursor-pointer border border-slate-800 text-purple-300 bg-[#111827] hover:bg-slate-900"
            >
              <RefreshCw size={11} /> Tự động đánh mã ghế
            </Button>
          </div>

          {/* Validation Warnings List */}
          <div className="flex flex-col gap-2 border-t border-slate-800 pt-4 mt-auto">
            <span className="text-[11px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1">
              <ShieldAlert size={12} className="text-amber-500" /> Thiết kế ({validationWarnings.length})
            </span>
            {validationWarnings.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto pr-1">
                {validationWarnings.map((w, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-red-950/20 border border-red-900/30 text-[10px] font-semibold text-red-400 flex items-start gap-1">
                    <span>•</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/35 text-[10px] font-semibold text-emerald-450 flex items-center gap-1">
                <Check size={10} /> Không có lỗi sơ đồ.
              </div>
            )}
          </div>

          <span className="text-[10px] text-slate-500 font-semibold mt-2">
            💡 Click để thêm Standard/VIP, kéo thả cho lối đi
          </span>

        </div>

        {/* Center Canvas */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden select-none bg-[#090d16]">

          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/75 backdrop-blur-sm z-40 rounded-r-3xl">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Đang tải cấu hình thiết kế phòng...</span>
            </div>
          ) : null}

          {/* Viewport Controls Canvas Area */}
          <div
            ref={canvasContainerRef}
            onMouseDown={handleCanvasMouseDown}
            className={`w-full h-[550px] relative overflow-hidden rounded-3xl border border-slate-850 bg-[#090d16] shadow-inner flex items-center justify-center ${activeMode === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
          >
            {/* Screen representation */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="bg-purple-950/65 border border-purple-800/40 text-purple-300 py-1.5 px-6 rounded-full shadow-lg font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                <Tv size={11} /> MÀN HÌNH CHIẾU
              </div>
            </div>

            {/* Marquee selection rect */}
            {isSelecting && marqueeStart && marqueeCurrent && (
              <div
                className="absolute border border-purple-500 bg-purple-550/15 pointer-events-none z-30 rounded-sm shadow-md"
                style={{
                  left: `${Math.min(marqueeStart.x, marqueeCurrent.x)}px`,
                  top: `${Math.min(marqueeStart.y, marqueeCurrent.y)}px`,
                  width: `${Math.abs(marqueeStart.x - marqueeCurrent.x)}px`,
                  height: `${Math.abs(marqueeStart.y - marqueeCurrent.y)}px`
                }}
              />
            )}

            {/* Canvas Inner sheet matching the white card in screenshot */}
            <div
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.1s cubic-bezier(0.1, 0.8, 0.2, 1)'
              }}
              className="bg-[#111827] shadow-2xl shadow-black/45 rounded-3xl border border-slate-850 p-12 flex flex-col items-center min-w-[700px]"
            >

              {/* Seats Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `auto repeat(${colsCount}, minmax(0, 1fr)) auto`,
                  gap: '8px'
                }}
                className="items-center"
              >
                {Array.from({ length: rowsCount }).map((_, r) => {
                  const rowLetter = getRowLetter(r);
                  const isHorizAisle = aisles.some(a => a.type === 'horizontal' && a.index === r);

                  return (
                    <React.Fragment key={rowLetter}>
                      {/* Row Label (Left) */}
                      <span
                        onClick={() => handleToggleAisle('horizontal', r)}
                        className={`w-8 text-center text-xs font-black cursor-pointer select-none hover:text-purple-400 transition-colors ${isHorizAisle ? 'text-red-500' : 'text-slate-500'}`}
                        title="Click để đặt lối đi ngang"
                      >
                        {isHorizAisle ? '🚶' : rowLetter}
                      </span>

                      {/* Column Cells */}
                      {Array.from({ length: colsCount }).map((_, cIdx) => {
                        const c = cIdx + 1;
                        const key = `${rowLetter}-${c}`;

                        const isVertAisle = aisles.some(a => a.type === 'vertical' && a.index === c);

                        let cellType: SeatTypeCategory | 'Aisle' | 'Empty' = 'Empty';
                        let cellStatus: 'Available' | 'Maintenance' | 'Disabled' = 'Available';
                        let cellCode = `${rowLetter}${c}`;

                        if (isVertAisle || isHorizAisle) {
                          cellType = 'Aisle';
                        } else {
                          const seat = seats[key];
                          if (seat) {
                            cellType = seat.type;
                            cellStatus = seat.status;
                            cellCode = seat.seatCode;
                          }
                        }

                        const { yOffset, rotation } = getCurveTransformation(c);

                        let isSweetboxLeft = false;
                        let isSweetboxRight = false;

                        if (cellType === 'Couple') {
                          const { pairs } = getRowCouplePairs(rowLetter);
                          const matchedPair = pairs.find(p => p.left === c || p.right === c);
                          if (matchedPair) {
                            if (c === matchedPair.left) {
                              isSweetboxLeft = true;
                            } else {
                              isSweetboxRight = true;
                            }
                          }
                        }

                        return (
                          <MemoizedSeat
                            key={key}
                            row={rowLetter}
                            col={c}
                            type={cellType}
                            status={cellStatus}
                            seatCode={cellCode}
                            isSelected={selectedIds.has(key)}
                            isSelecting={selectingIds.has(key)}
                            curveYOffset={yOffset}
                            curveRotation={rotation}
                            isSweetboxLeft={isSweetboxLeft}
                            isSweetboxRight={isSweetboxRight}
                            onClick={handleSeatClick}
                            onMouseEnter={handleSeatMouseEnter}
                            onMouseDown={handleSeatMouseDown}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            isDraggable={activeDrawingTool !== 'Couple' && cellType !== 'Empty' && cellType !== 'Aisle'}
                            isFirstCoupleSelected={coupleFirstSeat?.row === rowLetter && coupleFirstSeat?.col === c}
                          />
                        );
                      })}

                      {/* Row Label (Right) */}
                      <span
                        onClick={() => handleToggleAisle('horizontal', r)}
                        className={`w-8 text-center text-xs font-black cursor-pointer select-none hover:text-purple-400 transition-colors ${isHorizAisle ? 'text-red-500' : 'text-slate-500'}`}
                      >
                        {isHorizAisle ? '🚶' : rowLetter}
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Card Bottom Label Indicators */}
              <div className="flex justify-between w-full mt-8 border-t border-slate-850 pt-4 text-xs font-bold text-slate-500">
                <span>Hàng A → {getRowLetter(rowsCount - 1)}</span>
                <span>Cột 1 → {colsCount}</span>
              </div>

            </div>

            {/* Mini map overlays in bottom right corner */}
            <div className="absolute bottom-4 right-4 bg-[#111827]/95 border border-slate-800 rounded-2xl p-3 w-40 h-28 pointer-events-none select-none z-20 flex flex-col gap-1.5 shadow-2xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Mini-Map Layout</span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: `repeat(${rowsCount}, minmax(0, 1fr))`,
                  gap: '2px',
                  height: '100%'
                }}
                className="w-full flex-1 bg-slate-950 rounded border border-slate-850 p-1"
              >
                {Array.from({ length: rowsCount }).map((_, r) => {
                  const rowLetter = getRowLetter(r);
                  return (
                    <div key={rowLetter} className="flex gap-[2px] justify-center items-center">
                      {Array.from({ length: colsCount }).map((_, cIdx) => {
                        const c = cIdx + 1;
                        const key = `${rowLetter}-${c}`;
                        const isVertAisle = aisles.some(a => a.type === 'vertical' && a.index === c);
                        const isHorizAisle = aisles.some(a => a.type === 'horizontal' && a.index === r);
                        const seat = seats[key];

                        const isAisle = isVertAisle || isHorizAisle || (seat && seat.type === 'Aisle');
                        let color = 'bg-transparent';
                        if (isAisle) {
                          color = 'bg-slate-900';
                        } else if (seat) {
                          if (selectedIds.has(key) || selectingIds.has(key)) color = 'bg-purple-500';
                          else if (seat.status === 'Maintenance') color = 'bg-amber-500';
                          else if (seat.type === 'Disabled' || seat.status === 'Disabled') color = 'bg-slate-600';
                          else if (seat.type === 'VIP') color = 'bg-red-500';
                          else if (seat.type === 'Couple') color = 'bg-pink-500';
                          else color = 'bg-purple-500';
                        }

                        return (
                          <div key={key} className={`flex-1 h-1 rounded-sm ${color}`} />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mode instructions overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5 pointer-events-none text-[10px] font-bold text-slate-400 shadow-lg">
              <Info size={11} className="text-purple-400" />
              <span>
                {activeMode === 'select'
                  ? 'Nhấn chuột trái để vẽ. Kéo chuột để chọn vùng. Giữ Space để pan camera.'
                  : 'Nhấn giữ chuột trái để di chuyển sơ đồ màn hình.'}
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* 3. Footer Control Bar */}
      <div className="bg-[#1e293b] border-t border-slate-850 px-6 py-4 flex items-center justify-between">

        {/* Legends / Chú thích */}
        <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
          <span className="text-[11px] font-black uppercase text-slate-500 mr-2">Chú thích:</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            <span>Thường</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span>VIP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
            <span>Ghế đôi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-900 border border-slate-850" />
            <span>Lối đi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-800 border border-slate-750" />
            <span>Khóa/Hỏng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span>Bảo trì</span>
          </div>
        </div>

        {/* Cancel and Save buttons */}
        <div className="flex items-center gap-3 font-bold text-xs uppercase">
          <button
            onClick={() => fetchHallSeats(selectedHallId)}
            className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200 transition-colors cursor-pointer"
          >
            Hủy
          </button>

          <button
            onClick={handleSaveToDatabase}
            disabled={saving || !selectedHallId}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-950/20 cursor-pointer"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Lưu bố cục ({stats.total} ghế)
          </button>
        </div>
      </div>
      {/* JSON Import/Export Modal */}
      <AnimatePresence>
        {isJsonOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-[#111827] border border-slate-850 rounded-3xl p-6 shadow-2xl text-left flex flex-col gap-6"
            >
              <button
                onClick={() => setIsJsonOpen(false)}
                className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-400 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div>
                <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
                  <Download size={16} className="text-purple-400" /> Cấu HÌnh JSON Layout
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">
                  Xuất hoặc nhập cấu hình overrides sơ đồ ghế để di chuyển layout nhanh
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={14}
                  className="w-full p-4 bg-slate-950 border border-slate-800 text-xs text-purple-300 font-mono rounded-xl focus:outline-none focus:border-purple-500 h-80"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 border-t border-slate-850 pt-4 mt-2 font-bold text-xs uppercase">
                <Button type="button" variant="secondary" fullWidth onClick={() => setIsJsonOpen(false)}>
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  className="shadow-md bg-purple-650 hover:bg-purple-750 text-white font-black"
                  onClick={handleImportJson}
                >
                  <Upload size={14} /> Nhập Cấu Hình (Import)
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Seat Type Modal */}
      <AnimatePresence>
        {isAddTypeOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#111827] border border-slate-850 rounded-3xl p-6 shadow-2xl text-left flex flex-col gap-6"
            >
              <button
                onClick={() => setIsAddTypeOpen(false)}
                className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-400 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div>
                <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
                  Thêm Loại Ghế Mới
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">
                  Đăng ký loại ghế mới vào hệ thống rạp
                </span>
              </div>

              <form onSubmit={handleAddSeatType} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Tên Loại Ghế</span>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Testing Updated"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Hệ Số Giá (Multiplier)</span>
                  <input
                    type="number"
                    step={0.1}
                    required
                    value={newPriceMultiplier}
                    onChange={(e) => setNewPriceMultiplier(parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-semibold"
                  />
                </div>

                <div className="flex gap-4 border-t border-slate-850 pt-4 mt-2 font-bold text-xs uppercase">
                  <Button type="button" variant="secondary" fullWidth onClick={() => setIsAddTypeOpen(false)}>
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    className="bg-purple-650 hover:bg-purple-750 text-white font-black"
                  >
                    Thêm
                  </Button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Seat details Modal */}
      <AnimatePresence>
        {editingSeatKey && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#111827] border border-slate-850 rounded-3xl p-6 shadow-2xl text-left flex flex-col gap-6"
            >
              <button
                onClick={() => setEditingSeatKey(null)}
                className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-400 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div>
                <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
                  <Settings size={16} className="text-purple-400" /> Chi Tiết Ghế {editingSeatKey.replace('-', '')}
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">
                  Chỉnh sửa mã, loại, trạng thái và liên kết dữ liệu
                </span>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Mã Ghế (Seat Code)</span>
                  <input
                    type="text"
                    required
                    value={editSeatCode}
                    onChange={(e) => setEditSeatCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Loại Ghế</span>
                  <select
                    value={editSeatType}
                    onChange={(e) => setEditSeatType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="Standard">Standard (Thường)</option>
                    <option value="VIP">VIP</option>
                    <option value="Couple">Couple (Ghế đôi)</option>
                    <option value="Disabled">Disabled (Khóa)</option>
                    <option value="Aisle">Aisle (Lối đi)</option>
                    <option value="Empty">Empty (Khoảng trống)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Trạng Thái Ghế</span>
                  <select
                    value={editSeatStatus}
                    onChange={(e) => setEditSeatStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="Available">Available (Hoạt động)</option>
                    <option value="Maintenance">Maintenance (Bảo trì)</option>
                    <option value="Disabled">Disabled (Hỏng/Khóa)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Liên kết Database (DB Mapping)</span>
                  <select
                    value={editDbId || ''}
                    onChange={(e) => setEditDbId(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="">-- Tự động khớp (Auto match by code) --</option>
                    {dbSeats.map((d: any) => (
                      <option key={d.seatId} value={d.seatId}>
                        ID: {d.seatId} - Code: {d.seatCode} ({d.seatTypeName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 border-t border-slate-850 pt-4 mt-2 font-bold text-xs uppercase">
                  <Button type="button" variant="secondary" fullWidth onClick={() => setEditingSeatKey(null)}>
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    className="bg-purple-650 hover:bg-purple-750 text-white font-black"
                    onClick={handleSaveSingleSeat}
                  >
                    Áp Dụng
                  </Button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bulk selection action bar */}
      <AnimatePresence>
        {selectedIds.size > 1 && activeDrawingTool === 'Pointer' && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#111827]/95 border border-slate-800 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 backdrop-blur-md"
          >
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-purple-400 font-black uppercase tracking-wider">Thao tác hàng loạt</span>
              <span className="text-xs text-slate-200 font-bold">Đã chọn {selectedIds.size} ghế</span>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkChangeType('Standard')}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-slate-300 rounded-xl transition-all hover:bg-slate-800 cursor-pointer"
              >
                Standard
              </button>
              <button
                onClick={() => handleBulkChangeType('VIP')}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-red-300 rounded-xl transition-all hover:bg-slate-800 cursor-pointer"
              >
                VIP
              </button>
              <button
                onClick={() => handleBulkChangeType('Couple')}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-pink-300 rounded-xl transition-all hover:bg-slate-800 cursor-pointer"
              >
                Couple
              </button>
              <button
                onClick={() => handleBulkChangeStatus('Maintenance')}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-amber-300 rounded-xl transition-all hover:bg-slate-800 cursor-pointer"
              >
                Bảo trì
              </button>
              <button
                onClick={() => handleBulkChangeStatus('Disabled')}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-slate-400 rounded-xl transition-all hover:bg-slate-800 cursor-pointer"
              >
                Khóa
              </button>
              <button
                onClick={handleClearSelectedSeats}
                className="px-3 py-1.5 bg-red-950/20 border border-red-900/40 hover:border-red-900/60 text-[10px] font-bold text-red-400 rounded-xl transition-all hover:bg-red-955/40 cursor-pointer"
              >
                Xóa
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-350 rounded-xl transition-all hover:bg-slate-700 cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};