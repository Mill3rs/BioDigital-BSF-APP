import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * WatermelonDB schema.
 * Bump `version` and add a migration whenever columns change.
 */
export const dbSchema = appSchema({
  version: 1,
  tables: [
    // ── Waste records ──────────────────────────────────────────────────────────
    tableSchema({
      name: 'waste_records',
      columns: [
        { name: 'server_id',        type: 'string',  isOptional: true  },
        { name: 'source_name',      type: 'string'                      },
        { name: 'source_type',      type: 'string'                      },
        { name: 'quantity',         type: 'number'                      },
        { name: 'unit',             type: 'string'                      },
        { name: 'date',             type: 'number'                      }, // Unix ms
        { name: 'status',           type: 'string'                      },
        { name: 'description',      type: 'string',  isOptional: true  },
        { name: 'notes',            type: 'string',  isOptional: true  },
        { name: 'location_lat',     type: 'number',  isOptional: true  },
        { name: 'location_lng',     type: 'number',  isOptional: true  },
        { name: 'location_address', type: 'string',  isOptional: true  },
        { name: 'farm_id',          type: 'string',  isOptional: true  },
        { name: 'supplier_id',      type: 'string',  isOptional: true  },
        { name: 'driver_id',        type: 'string',  isOptional: true  },
        { name: 'carbon_saved',     type: 'number',  isOptional: true  },
        { name: 'points_awarded',   type: 'number',  isOptional: true  },
        { name: 'is_synced',        type: 'boolean'                     },
        { name: 'created_at',       type: 'number'                      },
        { name: 'updated_at',       type: 'number'                      },
      ],
    }),

    // ── Notifications ──────────────────────────────────────────────────────────
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'server_id',  type: 'string',  isOptional: true },
        { name: 'title',      type: 'string'                    },
        { name: 'message',    type: 'string'                    },
        { name: 'type',       type: 'string'                    },
        { name: 'read',       type: 'boolean'                   },
        { name: 'metadata',   type: 'string',  isOptional: true }, // JSON string
        { name: 'created_at', type: 'number'                    },
      ],
    }),
  ],
});
