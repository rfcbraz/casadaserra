-- T2: até 6 hóspedes (cama extra insuflável e sofá); T3: até 8 hóspedes (sofá-cama)
UPDATE "Room"
SET "capacity" = CASE UPPER("type")
  WHEN 'T2' THEN 6
  WHEN 'T3' THEN 8
  ELSE "capacity"
END,
"updatedAt" = NOW()
WHERE UPPER("type") IN ('T2', 'T3');
