CREATE OR REPLACE PROCEDURE insertar_censos_masivos(
    p_cantidad INTEGER,
    p_latitud_centro DOUBLE PRECISION DEFAULT 14.6349,
    p_longitud_centro DOUBLE PRECISION DEFAULT -90.5069
)
LANGUAGE plpgsql
AS $$
DECLARE
    latitud_minima CONSTANT DOUBLE PRECISION := 13.7;
    latitud_maxima CONSTANT DOUBLE PRECISION := 17.9;
    longitud_minima CONSTANT DOUBLE PRECISION := -92.3;
    longitud_maxima CONSTANT DOUBLE PRECISION := -88.2;
    nombres TEXT[] := ARRAY['Ana', 'Luis', 'María', 'Carlos', 'Sofía', 'José', 'Lucía', 'Miguel'];
    apellidos TEXT[] := ARRAY['García', 'Hernández', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez', 'Ramírez'];
BEGIN
    IF p_cantidad IS NULL OR p_cantidad < 1 THEN
        RAISE EXCEPTION 'La cantidad debe ser un entero mayor que cero.';
    END IF;
    IF p_latitud_centro IS NULL OR p_latitud_centro < latitud_minima OR p_latitud_centro > latitud_maxima
       OR p_longitud_centro IS NULL OR p_longitud_centro < longitud_minima OR p_longitud_centro > longitud_maxima THEN
        RAISE EXCEPTION 'El centro debe estar dentro de los límites geográficos de Guatemala.';
    END IF;

    INSERT INTO censuses (
        nombre,
        apellido,
        total_miembros,
        cantidad_televisores,
        latitud,
        longitud,
        origen,
        creado_por,
        "createdAt",
        "updatedAt"
    )
    SELECT
        nombres[1 + floor(random() * cardinality(nombres))::INTEGER],
        apellidos[1 + floor(random() * cardinality(apellidos))::INTEGER],
        1 + floor(random() * 8)::INTEGER,
        floor(random() * 6)::INTEGER,
        greatest(latitud_minima, least(latitud_maxima, p_latitud_centro + (random() - 0.5) * 0.02)),
        greatest(longitud_minima, least(longitud_maxima, p_longitud_centro + (random() - 0.5) * 0.02)),
        'masivo',
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM generate_series(1, p_cantidad);
END;
$$;
