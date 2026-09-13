// frontend/src/components/ConfirmHost.jsx
//
// Единственное окно подтверждения на всё приложение. Монтируется в App
// один раз, показывается по запросу из lib/confirm.js.

import { useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { registerConfirmHost } from '../lib/confirm';

export default function ConfirmHost() {
  const [request, setRequest] = useState(null);

  useEffect(() => registerConfirmHost((req) => setRequest(req)), []);

  const finish = (answer) => {
    request?.resolve(answer);
    setRequest(null);
  };

  return (
    <ConfirmDialog
      open={!!request}
      title={request?.title}
      text={request?.text}
      confirmLabel={request?.confirmLabel}
      cancelLabel={request?.cancelLabel}
      tone={request?.tone}
      commentLabel={request?.mode === 'comment' ? (request?.commentLabel || 'Комментарий') : null}
      commentPlaceholder={request?.commentPlaceholder}
      commentRequired={request?.commentRequired}
      onCancel={() => finish(request?.mode === 'comment' ? null : false)}
      onConfirm={(comment) => finish(request?.mode === 'comment' ? comment : true)}
    />
  );
}
