"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AudienceSelectorProps {
  audience: string;
  zoneFilter: string;
  unitFilter: string;
  zones: string[];
  units: { id: string; unitNumber: string; zone: string }[];
  onAudienceChange: (v: string) => void;
  onZoneChange: (v: string) => void;
  onUnitChange: (v: string) => void;
}

export function AudienceSelector({
  audience, zoneFilter, unitFilter, zones, units,
  onAudienceChange, onZoneChange, onUnitChange,
}: AudienceSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Audience</Label>
        <Select value={audience} onValueChange={onAudienceChange}>
          <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Owners</SelectItem>
            <SelectItem value="ZONE">By Zone</SelectItem>
            <SelectItem value="UNIT">Specific Unit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {audience === "ZONE" && (
        <div className="space-y-2">
          <Label>Zone</Label>
          <Select value={zoneFilter} onValueChange={onZoneChange}>
            <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
            <SelectContent>
              {zones.map((z) => (<SelectItem key={z} value={z}>{z}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}
      {audience === "UNIT" && (
        <div className="space-y-2">
          <Label>Unit</Label>
          <Select value={unitFilter} onValueChange={onUnitChange}>
            <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
            <SelectContent>
              {units.map((u) => (<SelectItem key={u.id} value={u.id}>Unit {u.unitNumber} ({u.zone})</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
