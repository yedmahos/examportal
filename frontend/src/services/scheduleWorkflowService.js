import { get, post, put } from "./api";

const idOf = (scheduleId) => encodeURIComponent(scheduleId);

export const scheduleWorkflowService = {
  summary() {
    return get("/schedules/workflow-summary");
  },
  approval(scheduleId) {
    return get(`/schedules/${idOf(scheduleId)}/approval`);
  },
  versions(scheduleId) {
    return get(`/schedules/${idOf(scheduleId)}/versions`);
  },
  version(scheduleId, version) {
    return get(`/schedules/${idOf(scheduleId)}/versions/${version}`);
  },
  compare(scheduleId, from, to) {
    return get(`/schedules/${idOf(scheduleId)}/versions/compare?from=${from}&to=${to}`);
  },
  impact(scheduleId) {
    return get(`/schedules/${idOf(scheduleId)}/impact`);
  },
  submit(scheduleId) {
    return post(`/schedules/${idOf(scheduleId)}/submit-review`, {});
  },
  verify(scheduleId) {
    return post(`/schedules/${idOf(scheduleId)}/verify`, {});
  },
  approve(scheduleId) {
    return post(`/schedules/${idOf(scheduleId)}/approve`, {});
  },
  publish(scheduleId) {
    return post(`/schedules/${idOf(scheduleId)}/publish`, { confirmImpact: true });
  },
  newVersion(scheduleId, changeReason) {
    return post(`/schedules/${idOf(scheduleId)}/new-version`, { changeReason });
  },
  returnStage(scheduleId, body) {
    return post(`/schedules/${idOf(scheduleId)}/return`, body);
  },
  updateVersion(scheduleId, version, body) {
    return put(`/schedules/${idOf(scheduleId)}/versions/${version}`, body);
  },
};
