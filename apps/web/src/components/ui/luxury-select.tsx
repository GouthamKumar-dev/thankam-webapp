import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface LuxurySelectOption {
  value: string;
  label: string;
}

export interface LuxurySelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | LuxurySelectOption)[];
  placeholder?: string;
  error?: boolean;
  className?: string;
  searchable?: boolean;
}

export function LuxurySelect({
  value,
  onChange,
  options,
  placeholder = "— Select —",
  error = false,
  className = "",
  searchable = true,
}: LuxurySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  }>({ left: 0, width: 0, maxHeight: 260 });

  // Normalize options to { value, label }
  const normalizedOptions: LuxurySelectOption[] = useMemo(() => {
    return options.map((opt) =>
      typeof opt === "string" ? { value: opt, label: opt } : opt,
    );
  }, [options]);

  const selectedLabel = useMemo(() => {
    const match = normalizedOptions.find((opt) => opt.value === value);
    return match ? match.label : value;
  }, [normalizedOptions, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(q),
    );
  }, [normalizedOptions, searchQuery]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 280;

    // Expand dropdown width to ensure complete option text is visible
    const desiredWidth = Math.max(rect.width, 360);
    const availableWidth = window.innerWidth - 32;
    const finalWidth = Math.min(desiredWidth, availableWidth);
    let leftPos = rect.left;
    if (leftPos + finalWidth > window.innerWidth - 16) {
      leftPos = Math.max(16, window.innerWidth - finalWidth - 16);
    }

    if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
      // Open downwards
      setCoords({
        top: rect.bottom + 4,
        left: leftPos,
        width: finalWidth,
        maxHeight: Math.min(dropdownHeight, Math.max(160, spaceBelow - 16)),
      });
    } else {
      // Open upwards
      setCoords({
        bottom: window.innerHeight - rect.top + 4,
        left: leftPos,
        width: finalWidth,
        maxHeight: Math.min(dropdownHeight, Math.max(160, spaceAbove - 16)),
      });
    }
  }, []);

  const toggleOpen = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
      setSearchQuery("");
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 50);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };

    const handleResize = () => updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`h-11 w-full rounded-xl border-[1.5px] px-3.5 text-sm font-medium flex items-center justify-between transition-all bg-[#FAF9F6] text-left select-none ${
          error
            ? "border-rose-400 bg-rose-50 text-rose-700 focus:border-rose-400"
            : isOpen
              ? "border-[#B8860B] bg-white ring-2 ring-[#B8860B]/20 shadow-xs"
              : "border-slate-200 text-slate-800 hover:border-[#D4AF37]/60 hover:bg-white"
        }`}
      >
        <span
          title={selectedLabel}
          className={`truncate ${
            !value ? "text-slate-400 font-normal" : "text-slate-800 font-semibold"
          }`}
        >
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ml-2 ${
            isOpen ? "rotate-180 text-[#B8860B]" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu via Portal to avoid any clipping */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            className="fixed z-[9999] rounded-2xl bg-white border border-[#D4AF37]/50 shadow-[0_16px_45px_rgba(8,12,20,0.28)] flex flex-col overflow-hidden animate-fade-in"
            style={{
              top: coords.top !== undefined ? `${coords.top}px` : "auto",
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : "auto",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: `${coords.maxHeight}px`,
            }}
          >
            {/* Optional Quick Search */}
            {searchable && normalizedOptions.length > 7 && (
              <div className="p-2 border-b border-slate-100 bg-[#FAF9F6] shrink-0">
                <div className="relative flex items-center">
                  <Search size={13} className="absolute left-2.5 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options…"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-7 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#B8860B] focus:outline-none focus:ring-1 focus:ring-[#B8860B]/30"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50 py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-400 text-center italic">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-medium cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-amber-50 text-amber-900 font-bold"
                          : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                      }`}
                    >
                      <span className="pr-2 leading-snug whitespace-normal break-words text-xs sm:text-sm">
                        {opt.label}
                      </span>
                      {isSelected && (
                        <Check size={14} className="text-[#B8860B] shrink-0 stroke-[2.5]" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
