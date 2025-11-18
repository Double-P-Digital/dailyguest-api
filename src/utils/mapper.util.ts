export const mapDocumentToDto = <T>(doc: any): T => {
  const { _id, __v, ...rest } = doc.toObject();
  return { id: _id.toString(), ...rest } as T;
};
