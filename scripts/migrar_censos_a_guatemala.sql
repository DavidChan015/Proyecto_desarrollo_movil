BEGIN;

WITH localidades (numero, latitud, longitud) AS (
    VALUES
        (1, 14.6349::DOUBLE PRECISION, -90.5069::DOUBLE PRECISION),
        (2, 15.4708, -90.3708),
        (3, 15.1028, -90.3147),
        (4, 15.7278, -88.5944),
        (5, 14.9722, -89.5306),
        (6, 14.8000, -89.5458),
        (7, 14.6333, -89.9833),
        (8, 14.2917, -89.8958),
        (9, 14.2764, -90.2981),
        (10, 14.3050, -90.7850),
        (11, 14.6611, -90.8194),
        (12, 14.5586, -90.7295),
        (13, 14.8347, -91.5181),
        (14, 14.9117, -91.3611),
        (15, 14.7731, -91.1833),
        (16, 15.0306, -91.1486),
        (17, 15.3197, -91.4714),
        (18, 14.9667, -91.8000),
        (19, 14.5361, -91.6778),
        (20, 14.5333, -91.5000),
        (21, 16.9226, -89.8990),
        (22, 14.8528, -90.0642)
),
censos AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY id) AS numero
    FROM censuses
    WHERE origen = 'masivo' AND creado_por IS NULL
)
UPDATE censuses AS censo
SET
    latitud = localidad.latitud + (random() - 0.5) * 0.001,
    longitud = localidad.longitud + (random() - 0.5) * 0.001,
    "updatedAt" = CURRENT_TIMESTAMP
FROM censos
JOIN localidades AS localidad
    ON localidad.numero = ((censos.numero - 1) % 22) + 1
WHERE censo.id = censos.id;

COMMIT;
