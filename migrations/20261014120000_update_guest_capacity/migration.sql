UPDATE "Room"
SET "capacity" = CASE UPPER("type")
  WHEN 'T2' THEN 6
  WHEN 'T3' THEN 9
  ELSE "capacity"
END,
"updatedAt" = NOW()
WHERE UPPER("type") IN ('T2', 'T3');