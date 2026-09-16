import mongoose, { Schema, Document, Model } from 'mongoose';
import type { AppendixAKit, KitItemMetaMap } from '@repo/shared';

export interface IKitState {
  userId: mongoose.Types.ObjectId | string;
  kit: AppendixAKit;
  itemMeta: KitItemMetaMap;
  deletedItemIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IKitDocument extends IKitState, Document {
  id: string;
}

const ItemMetaRecordSchema = new Schema(
  {
    origin: {
      type: String,
      enum: ['generated', 'user_edited', 'user_added'],
      default: 'generated',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const KitSchema = new Schema<IKitDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    kit: {
      type: Schema.Types.Mixed,
      required: true,
    },
    itemMeta: {
      type: Map,
      of: ItemMetaRecordSchema,
      default: {},
    },
    deletedItemIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      },
    },
  }
);

export const KitModel: Model<IKitDocument> =
  mongoose.models.Kit || mongoose.model<IKitDocument>('Kit', KitSchema);

// Helper to initialize item metadata for freshly generated kits
export function initializeItemMeta(kit: AppendixAKit, existingMeta: KitItemMetaMap = {}): KitItemMetaMap {
  const meta: KitItemMetaMap = { ...existingMeta };

  for (const q of kit.questions) {
    if (!meta[q.id]) {
      meta[q.id] = { origin: 'generated', isPinned: false };
    }
  }

  for (const f of kit.flashcards) {
    if (!meta[f.id]) {
      meta[f.id] = { origin: 'generated', isPinned: false };
    }
  }

  return meta;
}
