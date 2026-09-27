import React, { useEffect, useState } from 'react';
import { validateReviewInvite, submitReviewInvite } from '../../services/menuRepository';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { CheckCircle, Star } from 'lucide-react';

export const ReviewInvitePage = ({ token }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: '', displayName: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) {
        setMessage('Avaliacoes por convite dependem do Supabase configurado.');
        setLoading(false);
        return;
      }
      try {
        const inviteStatus = await validateReviewInvite(token);
        setStatus(inviteStatus);
      } catch (error) {
        setMessage(error.message || 'Nao foi possivel validar o convite.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      await submitReviewInvite({
        token,
        rating: Number(form.rating),
        comment: form.comment.trim(),
        displayName: form.displayName.trim(),
      });
      setDone(true);
    } catch (error) {
      setMessage(error.message || 'Este convite nao pode ser usado.');
    } finally {
      setSubmitting(false);
    }
  };

  const invalidReason = status && !status.is_valid;

  return (
    <div className="review-page-shell">
      <main className="review-invite-card">
        <span className="tenant-brand-pill">MenuFlow</span>
        <h1>Avaliar produto</h1>

        {loading && <p>Validando convite...</p>}
        {message && <div className="admin-message">{message}</div>}

        {invalidReason && (
          <div className="empty-reviews-card">
            <strong>Convite invalido ou ja usado.</strong>
            <span>Para proteger as avaliacoes, cada link funciona uma unica vez e deve estar dentro do prazo.</span>
          </div>
        )}

        {status?.is_valid && !done && (
          <form className="review-form" onSubmit={handleSubmit}>
            <div className="verified-tag review-verified"><CheckCircle size={14} /> Compra verificada por convite</div>
            <h2>{status.product_name}</h2>
            <p>{status.restaurant_name}</p>

            <label className="form-label">Nota</label>
            <div className="rating-input-row">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  className={Number(form.rating) >= rating ? 'star-choice active' : 'star-choice'}
                  onClick={() => setForm({ ...form, rating })}
                  aria-label={`${rating} estrelas`}
                >
                  <Star size={26} fill="currentColor" />
                </button>
              ))}
            </div>

            <label className="form-label">Comentario opcional</label>
            <textarea
              className="notes-input-area"
              value={form.comment}
              onChange={(event) => setForm({ ...form, comment: event.target.value })}
              placeholder="Conte rapidamente como foi sua experiencia."
              maxLength={400}
            />

            <label className="form-label">Nome de exibicao opcional</label>
            <input
              className="form-input"
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              placeholder="Ex: Ana P."
              maxLength={40}
            />

            <button className="btn-primary-action admin-auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar avaliacao'}
            </button>
          </form>
        )}

        {done && (
          <div className="empty-reviews-card success-card">
            <strong>Obrigado pela avaliacao.</strong>
            <span>Ela pode aparecer no cardapio apos conferencia de conteudo improprio pela pizzaria.</span>
          </div>
        )}
      </main>
    </div>
  );
};
