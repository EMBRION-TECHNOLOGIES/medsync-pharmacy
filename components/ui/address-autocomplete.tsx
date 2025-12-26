'use client';

import * as React from 'react';
import { Search, MapPin, Loader2, X, Check, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { geocodingService, type AddressSuggestion } from '@/lib/geocoding';

export interface AddressAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onAddressSelect?: (address: {
    formattedAddress: string;
    city?: string;
    state?: string;
    latitude: number;
    longitude: number;
  }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onGeolocation?: () => void;
  showGeolocationButton?: boolean;
  isGeolocating?: boolean;
}

export function AddressAutocomplete({
  value = '',
  onChange,
  onAddressSelect,
  placeholder = 'Search for an address...',
  className,
  disabled = false,
  onGeolocation,
  showGeolocationButton = true,
  isGeolocating = false,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = React.useState(value);
  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const [isVerified, setIsVerified] = React.useState(false);

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync external value changes
  React.useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Click outside to close
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const searchAddresses = React.useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await geocodingService.getAddressSuggestions(query);

      if (result.success && result.data) {
        setSuggestions(result.data);
        setIsOpen(result.data.length > 0);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsVerified(false);
    onChange?.(newValue);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce search by 300ms
    debounceTimerRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setIsOpen(false);
    setIsLoading(true);
    setInputValue(suggestion.description);

    try {
      const result = await geocodingService.getPlaceDetails(suggestion.placeId);

      if (result.success && result.data) {
        const addr = result.data;
        const formattedAddress = addr.formattedAddress || suggestion.description;

        setInputValue(formattedAddress);
        setIsVerified(true);
        onChange?.(formattedAddress);

        onAddressSelect?.({
          formattedAddress,
          city: addr.city,
          state: addr.state,
          latitude: addr.latitude,
          longitude: addr.longitude,
        });

        geocodingService.resetSessionToken();
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Scroll selected item into view
  React.useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Clear input
  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    setIsVerified(false);
    setSelectedIndex(-1);
    onChange?.('');
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          {/* Search Icon */}
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Input */}
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'pl-9 pr-9',
              isVerified && 'border-green-500 bg-green-50 focus-visible:border-green-500 focus-visible:ring-green-500/20',
            )}
            autoComplete="off"
          />

          {/* Right Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            {isVerified && !isLoading && (
              <Check className="h-4 w-4 text-green-600" />
            )}
            {inputValue && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                disabled={disabled}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Geolocation Button */}
        {showGeolocationButton && onGeolocation && (
          <button
            type="button"
            onClick={onGeolocation}
            disabled={disabled || isGeolocating}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
              'h-9'
            )}
            title="Use current location"
          >
            {isGeolocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
          role="listbox"
        >
          <div className="max-h-[300px] overflow-y-auto p-1">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.placeId}
                role="option"
                aria-selected={selectedIndex === index}
                className={cn(
                  'relative flex cursor-pointer items-start gap-3 rounded-sm px-3 py-2.5 text-sm outline-none transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  selectedIndex === index && 'bg-accent text-accent-foreground',
                )}
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <div className="flex-1 space-y-0.5">
                  <p className="font-medium leading-none">
                    {suggestion.mainText}
                  </p>
                  {suggestion.secondaryText && (
                    <p className="text-xs text-muted-foreground">
                      {suggestion.secondaryText}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Badge */}
      {isVerified && (
        <p className="mt-1.5 text-xs font-medium text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Address verified with coordinates
        </p>
      )}
    </div>
  );
}
