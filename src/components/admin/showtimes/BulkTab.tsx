import React from 'react';
import type { ApiShowtime, ApiPrice, NormalizedMovie, MappedHall, DryRunShowtime } from '../../../types/showtime';
import type { Cinema } from '../../../types';
import { useBulkTabState } from './bulk/hooks/useBulkTabState';
import { BulkConfigPanel } from './bulk/components/BulkConfigPanel';
import { BulkTimePanel } from './bulk/components/BulkTimePanel';
import { BulkPreviewPanel } from './bulk/components/BulkPreviewPanel';

export interface BulkTabProps {
  movies: NormalizedMovie[];
  cinemas: Cinema[];
  dbPrices: ApiPrice[];
  showtimesList: ApiShowtime[];

  bulkMovieIds: number[];
  setBulkMovieIds: React.Dispatch<React.SetStateAction<number[]>>;
  bulkMovieWeights: Record<number, number>;
  setBulkMovieWeights: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  bulkOptimizePrimeTime: boolean;
  setBulkOptimizePrimeTime: (val: boolean) => void;
  bulkCinemaId: number;
  setBulkCinemaId: (id: number) => void;
  bulkSelectedHalls: number[];
  setBulkSelectedHalls: React.Dispatch<React.SetStateAction<number[]>>;
  bulkSelectedDates: string[];
  setBulkSelectedDates: React.Dispatch<React.SetStateAction<string[]>>;
  bulkTimeSlots: string[];
  setBulkTimeSlots: React.Dispatch<React.SetStateAction<string[]>>;
  bulkHallsList: MappedHall[];
  bulkLoadingHalls: boolean;
  bulkPriceId: number;
  setBulkPriceId: (id: number) => void;
  bulkStaggerMinutes: number;
  setBulkStaggerMinutes: (val: number) => void;
  isBulkDryRun: boolean;
  setIsBulkDryRun: (val: boolean) => void;
  bulkMode: 'Manual' | 'Auto';
  setBulkMode: (mode: 'Manual' | 'Auto') => void;
  dryRunShowtimes: DryRunShowtime[];
  setDryRunShowtimes: React.Dispatch<React.SetStateAction<DryRunShowtime[]>>;
  saving: boolean;
  onBulkCreateWithSelection: (selectedItems: DryRunShowtime[], savingSetter: (val: boolean) => void) => Promise<boolean>;
  flatPriceEnabled: boolean;
  setFlatPriceEnabled: (val: boolean) => void;
  flatPrice: number | null;
  setFlatPrice: (val: number | null) => void;
}

export const BulkTab: React.FC<BulkTabProps> = React.memo((props) => {
  const state = useBulkTabState(props);

  return (
    <div className="flex flex-col gap-5 text-left">
      {/* 1. Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BulkConfigPanel
          movies={props.movies}
          cinemas={props.cinemas}
          bulkMovieIds={props.bulkMovieIds}
          setBulkMovieIds={props.setBulkMovieIds}
          bulkMovieWeights={props.bulkMovieWeights}
          setBulkMovieWeights={props.setBulkMovieWeights}
          bulkCinemaId={props.bulkCinemaId}
          setBulkCinemaId={props.setBulkCinemaId}
          bulkSelectedHalls={props.bulkSelectedHalls}
          setBulkSelectedHalls={props.setBulkSelectedHalls}
          bulkHallsList={props.bulkHallsList}
          bulkLoadingHalls={props.bulkLoadingHalls}
          setIsBulkDryRun={props.setIsBulkDryRun}
        />

        <BulkTimePanel
          upcomingDates={state.upcomingDates}
          bulkSelectedDates={props.bulkSelectedDates}
          setBulkSelectedDates={props.setBulkSelectedDates}
          autoStartHour={state.autoStartHour}
          setAutoStartHour={state.setAutoStartHour}
          bufferMinutes={state.bufferMinutes}
          setBufferMinutes={state.setBufferMinutes}
          bulkStaggerMinutes={props.bulkStaggerMinutes}
          setBulkStaggerMinutes={props.setBulkStaggerMinutes}
          bulkOptimizePrimeTime={props.bulkOptimizePrimeTime}
          setBulkOptimizePrimeTime={props.setBulkOptimizePrimeTime}
          bulkPriceId={props.bulkPriceId}
          setBulkPriceId={props.setBulkPriceId}
          dbPrices={props.dbPrices}
          handlePreviewSchedule={state.handlePreviewSchedule}
          setIsBulkDryRun={props.setIsBulkDryRun}
          flatPriceEnabled={props.flatPriceEnabled}
          setFlatPriceEnabled={props.setFlatPriceEnabled}
          flatPrice={props.flatPrice}
          setFlatPrice={props.setFlatPrice}
        />
      </div>

      {/* 2. Dry Run Visualization & Selection */}
      {props.isBulkDryRun && (
        <BulkPreviewPanel
          dryRunShowtimes={props.dryRunShowtimes}
          memoizedDataSource={state.memoizedDataSource}
          validCount={state.validCount}
          invalidCount={state.invalidCount}
          selectedRowKeys={state.selectedRowKeys}
          bulkSelectedDates={props.bulkSelectedDates}
          activePreviewDate={state.activePreviewDate}
          setActivePreviewDate={state.setActivePreviewDate}
          bulkHallsList={props.bulkHallsList}
          showtimesList={props.showtimesList}
          movies={props.movies}
          moviesMap={state.moviesMap}
          saving={props.saving}
          bulkSaving={state.bulkSaving}
          setIsBulkDryRun={props.setIsBulkDryRun}
          handleConfirmCreate={state.handleConfirmCreate}
          handleRowSelectionChange={state.handleRowSelectionChange}
          handleSelectAll={state.handleSelectAll}
          handleClearAll={state.handleClearAll}
          handleSelectValid={state.handleSelectValid}
        />
      )}
    </div>
  );
});

BulkTab.displayName = 'BulkTab';
