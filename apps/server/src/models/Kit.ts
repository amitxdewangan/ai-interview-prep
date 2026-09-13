import mongoose, { Schema, Document, Model } from 'mongoose';
import type { AppendixAKit, ItemOrigin, ItemMeta, KitItemMetaMap } from '@repo/shared';

export interface IKitState {
  userId: string;
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
      type: String,
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

// In-Memory Kit Store for test/fallback mode
export interface InMemoryKit extends IKitState {
  id: string;
  _id: string;
}

const inMemoryKits = new Map<string, InMemoryKit>();

export class KitStore {
  static async create(data: {
    userId: string;
    kit: AppendixAKit;
    itemMeta?: KitItemMetaMap;
    deletedItemIds?: string[];
  }): Promise<IKitDocument | InMemoryKit> {
    const meta = data.itemMeta ?? initializeItemMeta(data.kit);
    const deleted = data.deletedItemIds ?? [];

    if (mongoose.connection.readyState === 1) {
      const created = await KitModel.create({
        userId: data.userId,
        kit: data.kit,
        itemMeta: meta,
        deletedItemIds: deleted,
      });
      return created;
    }

    const id = `kit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const stored: InMemoryKit = {
      id,
      _id: id,
      userId: data.userId,
      kit: JSON.parse(JSON.stringify(data.kit)),
      itemMeta: meta,
      deletedItemIds: [...deleted],
      createdAt: now,
      updatedAt: now,
    };

    inMemoryKits.set(id, stored);
    return stored;
  }

  static async findById(id: string, userId?: string): Promise<IKitDocument | InMemoryKit | null> {
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      const query: Record<string, any> = { _id: id };
      if (userId) query.userId = userId;
      return KitModel.findOne(query);
    }

    const kit = inMemoryKits.get(id);
    if (!kit) return null;
    if (userId && kit.userId !== userId) return null;
    return kit;
  }

  static async findByUserId(userId: string): Promise<Array<IKitDocument | InMemoryKit>> {
    if (mongoose.connection.readyState === 1) {
      return KitModel.find({ userId }).sort({ updatedAt: -1 });
    }

    const list: InMemoryKit[] = [];
    for (const kit of inMemoryKits.values()) {
      if (kit.userId === userId) {
        list.push(kit);
      }
    }
    return list.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
  }

  static async update(
    id: string,
    userId: string,
    updates: {
      kit?: AppendixAKit;
      itemMeta?: KitItemMetaMap;
      deletedItemIds?: string[];
    }
  ): Promise<IKitDocument | InMemoryKit | null> {
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      const updatePayload: Record<string, any> = {};
      if (updates.kit) updatePayload.kit = updates.kit;
      if (updates.itemMeta) updatePayload.itemMeta = updates.itemMeta;
      if (updates.deletedItemIds) updatePayload.deletedItemIds = updates.deletedItemIds;

      return KitModel.findOneAndUpdate({ _id: id, userId }, { $set: updatePayload }, { new: true });
    }

    const existing = inMemoryKits.get(id);
    if (!existing || existing.userId !== userId) {
      return null;
    }

    if (updates.kit) existing.kit = JSON.parse(JSON.stringify(updates.kit));
    if (updates.itemMeta) existing.itemMeta = { ...updates.itemMeta };
    if (updates.deletedItemIds) existing.deletedItemIds = [...updates.deletedItemIds];
    existing.updatedAt = new Date();

    return existing;
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return false;
      }
      const res = await KitModel.deleteOne({ _id: id, userId });
      return (res.deletedCount || 0) > 0;
    }

    const existing = inMemoryKits.get(id);
    if (!existing || existing.userId !== userId) {
      return false;
    }
    return inMemoryKits.delete(id);
  }

  static clear(): void {
    inMemoryKits.clear();
  }
}
